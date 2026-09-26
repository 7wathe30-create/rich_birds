import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { privateKeyToAccount } from "viem/accounts";
import sharp from "sharp";
import { createApiHandler } from "../server/api.js";
import { createDatabase } from "../server/database.js";

const account = privateKeyToAccount(`0x${"01".padStart(64, "0")}`);
const otherAccount = privateKeyToAccount(`0x${"02".padStart(64, "0")}`);
let tempDir;

before(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "rich-birds-server-"));
});

after(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

async function startApp({
  dbPath = join(tempDir, `${Math.random()}.sqlite`),
  port = 0,
  clock = Date.now,
  env = {},
  apiOptions = {},
} = {}) {
  let api;
  const server = createServer((req, res) => api(req, res));
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const database = createDatabase(dbPath);
  api = createApiHandler({
    database,
    appOrigin: origin,
    clock,
    env: { CHAIN_NETWORK: "testnet", ...env },
    ...apiOptions,
  });
  let closed = false;
  let currentChallengeCookie = null;

  async function request(
    path,
    {
      method = "GET",
      body,
      cookie,
      challengeCookie,
      omitChallengeCookie = false,
      walletAddress = account.address,
      omitWalletAddress = false,
      originHeader = origin,
    } = {},
  ) {
    const bindingCookie = omitChallengeCookie
      ? null
      : challengeCookie || currentChallengeCookie;
    const response = await fetch(`${origin}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(originHeader === null ? {} : { origin: originHeader }),
        ...(!omitWalletAddress && walletAddress
          ? { "x-wallet-address": walletAddress }
          : {}),
        ...(cookie || bindingCookie
          ? { cookie: [cookie, bindingCookie].filter(Boolean).join("; ") }
          : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
      setCookie: response.headers.get("set-cookie"),
    };
    if (path === "/api/auth/challenge" && result.status === 200)
      currentChallengeCookie = `rb_challenge=${result.setCookie?.match(/(?:^|,\s*)rb_challenge=([a-f0-9]{64})/)?.[1]}`;
    return result;
  }

  return {
    origin,
    port: server.address().port,
    dbPath,
    request,
    async close() {
      if (closed) return;
      closed = true;
      await new Promise((resolve) => server.close(resolve));
      database.close();
    },
  };
}

async function challenge(app, address = account.address) {
  return app.request("/api/auth/challenge", {
    method: "POST",
    body: { address, chainId: 46630 },
  });
}

async function login(app, signer = account) {
  const result = await challenge(app, signer.address);
  assert.equal(result.status, 200);
  const signature = await signer.signMessage({ message: result.body.message });
  return app.request("/api/auth/verify", {
    method: "POST",
    body: { message: result.body.message, signature },
    challengeCookie: challengeCookie(result),
  });
}

function challengeCookie(result) {
  const value = result.setCookie?.match(
    /(?:^|,\s*)rb_challenge=([a-f0-9]{64})/,
  )?.[1];
  assert.ok(value, "challenge response must set an HttpOnly binding cookie");
  assert.match(result.setCookie, /HttpOnly/);
  assert.match(result.setCookie, /SameSite=Strict/);
  return `rb_challenge=${value}`;
}

function sessionCookie(result) {
  assert.match(result.setCookie || "", /^rb_session=[a-f0-9]{64};/);
  assert.match(result.setCookie, /HttpOnly/);
  assert.match(result.setCookie, /SameSite=Strict/);
  return result.setCookie.split(";", 1)[0];
}

test("SIWE challenge authenticates a real account, persists session/profile and rejects replay", async () => {
  const dbPath = join(tempDir, "persistent.sqlite");
  const app = await startApp({ dbPath });
  try {
    const response = await challenge(app);
    assert.equal(response.status, 200);
    assert.match(
      response.body.message,
      new RegExp(
        `^127\\.0\\.0\\.1:${app.port} wants you to sign in with your Ethereum account:`,
      ),
    );
    assert.match(
      response.body.message,
      /Chain ID: 46630\nNonce: [a-f0-9]{32}\nIssued At:/,
    );
    const signature = await account.signMessage({
      message: response.body.message,
    });
    const binding = challengeCookie(response);
    const verified = await app.request("/api/auth/verify", {
      method: "POST",
      body: { message: response.body.message, signature },
      challengeCookie: binding,
    });
    assert.equal(verified.status, 200);
    assert.equal(verified.body.address, account.address);
    assert.equal(verified.body.profile, null);
    const cookie = sessionCookie(verified);
    assert.deepEqual((await app.request("/api/session", { cookie })).body, {
      address: account.address,
      profile: null,
    });

    const png = await sharp({
      create: { width: 8, height: 6, channels: 3, background: "#336699" },
    })
      .png()
      .toBuffer();
    const profile = await app.request("/api/profile", {
      method: "PUT",
      cookie,
      body: {
        nickname: "  Robin  ",
        avatar: {
          kind: "upload",
          src: `data:image/png;base64,${png.toString("base64")}`,
        },
      },
    });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.profile.nickname, "Robin");
    assert.equal(profile.body.profile.avatar.kind, "upload");
    const savedImage = Buffer.from(
      profile.body.profile.avatar.src.split(",")[1],
      "base64",
    );
    assert.deepEqual(
      await sharp(savedImage)
        .metadata()
        .then(({ format, width, height }) => ({ format, width, height })),
      { format: "png", width: 256, height: 256 },
    );

    await app.close();
    const restarted = await startApp({ dbPath });
    try {
      assert.deepEqual(
        (await restarted.request("/api/session", { cookie })).body,
        {
          address: account.address,
          profile: profile.body.profile,
        },
      );
      const replay = await restarted.request("/api/auth/verify", {
        method: "POST",
        body: { message: response.body.message, signature },
        challengeCookie: binding,
      });
      assert.equal(replay.status, 401);
    } finally {
      await restarted.close();
    }
  } finally {
    await app.close();
  }
});

test("challenge enforces origin, valid address and the selected network", async () => {
  const app = await startApp();
  try {
    assert.equal((await challenge(app, "not-an-address")).status, 400);
    assert.equal(
      (
        await app.request("/api/auth/challenge", {
          method: "POST",
          body: { address: account.address, chainId: 1 },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await app.request("/api/auth/challenge", {
          method: "POST",
          body: { address: account.address, chainId: 46630 },
          originHeader: null,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await app.request("/api/auth/challenge", {
          method: "POST",
          body: { address: account.address, chainId: 46630 },
          originHeader: "https://attacker.example",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await app.request("/api/auth/challenge", {
          method: "POST",
          body: { address: account.address, chainId: 46630 },
        })
      ).status,
      200,
    );
  } finally {
    await app.close();
  }
});

test("an explicitly allow-listed Preview origin is signed exactly and receives a Secure cookie", async () => {
  const previewOrigin = "https://preview.rich-birds.example";
  const app = await startApp({ env: { APP_ALLOWED_ORIGINS: previewOrigin } });
  try {
    const body = { address: account.address, chainId: 46630 };
    assert.equal(
      (
        await app.request("/api/auth/challenge", {
          method: "POST",
          body,
          originHeader: "https://untrusted.example",
        })
      ).status,
      403,
    );
    const issued = await app.request("/api/auth/challenge", {
      method: "POST",
      body,
      originHeader: previewOrigin,
    });
    assert.equal(issued.status, 200);
    assert.match(
      issued.body.message,
      new RegExp(`^preview\\.rich-birds\\.example wants`),
    );
    assert.match(
      issued.body.message,
      /URI: https:\/\/preview\.rich-birds\.example/,
    );
    const signature = await account.signMessage({
      message: issued.body.message,
    });
    const verified = await app.request("/api/auth/verify", {
      method: "POST",
      body: { message: issued.body.message, signature },
      challengeCookie: challengeCookie(issued),
      originHeader: previewOrigin,
    });
    assert.equal(verified.status, 200);
    assert.match(verified.setCookie, /; Secure/);
    assert.equal(
      (
        await app.request("/api/auth/logout", {
          method: "POST",
          originHeader: previewOrigin,
          cookie: sessionCookie(verified),
        })
      ).status,
      200,
    );
  } finally {
    await app.close();
  }
});

test("SIWE verification requires its browser-bound challenge cookie and keeps parallel challenges independent", async () => {
  const app = await startApp();
  try {
    const first = await challenge(app);
    const firstBinding = challengeCookie(first);
    const firstSignature = await account.signMessage({
      message: first.body.message,
    });
    const second = await challenge(app);
    const secondBinding = challengeCookie(second);

    assert.equal(
      (
        await app.request("/api/auth/verify", {
          method: "POST",
          body: { message: first.body.message, signature: firstSignature },
          challengeCookie: secondBinding,
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await app.request("/api/auth/verify", {
          method: "POST",
          body: { message: first.body.message, signature: firstSignature },
          omitChallengeCookie: true,
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await app.request("/api/auth/verify", {
          method: "POST",
          body: { message: first.body.message, signature: firstSignature },
          challengeCookie: firstBinding,
        })
      ).status,
      200,
    );

    const secondSignature = await account.signMessage({
      message: second.body.message,
    });
    assert.equal(
      (
        await app.request("/api/auth/verify", {
          method: "POST",
          body: { message: second.body.message, signature: secondSignature },
          challengeCookie: secondBinding,
        })
      ).status,
      200,
    );
  } finally {
    await app.close();
  }
});

test("signatures from another address, tampering and challenge replay do not authenticate", async () => {
  const app = await startApp();
  try {
    const issued = await challenge(app);
    const wrongSignerSignature = await otherAccount.signMessage({
      message: issued.body.message,
    });
    const binding = challengeCookie(issued);
    assert.equal(
      (
        await app.request("/api/auth/verify", {
          method: "POST",
          body: {
            message: issued.body.message,
            signature: wrongSignerSignature,
          },
          challengeCookie: binding,
        })
      ).status,
      401,
    );

    const next = await challenge(app);
    const validSignature = await account.signMessage({
      message: next.body.message,
    });
    assert.equal(
      (
        await app.request("/api/auth/verify", {
          method: "POST",
          body: {
            message: `${next.body.message}\nURI: https://attacker.example`,
            signature: validSignature,
          },
        })
      ).status,
      401,
    );
    const verified = await app.request("/api/auth/verify", {
      method: "POST",
      body: { message: next.body.message, signature: validSignature },
    });
    assert.equal(verified.status, 200);
    assert.equal(
      (
        await app.request("/api/auth/verify", {
          method: "POST",
          body: { message: next.body.message, signature: validSignature },
        })
      ).status,
      401,
    );
  } finally {
    await app.close();
  }
});

test("a challenge can be consumed by only one concurrent verification", async () => {
  const app = await startApp();
  try {
    const issued = await challenge(app);
    const signature = await account.signMessage({
      message: issued.body.message,
    });
    const body = { message: issued.body.message, signature };
    const results = await Promise.all([
      app.request("/api/auth/verify", { method: "POST", body }),
      app.request("/api/auth/verify", { method: "POST", body }),
    ]);
    assert.deepEqual(results.map(({ status }) => status).sort(), [200, 401]);
  } finally {
    await app.close();
  }
});

test("expired challenges, unauthorized profile writes and invalid image data fail closed", async () => {
  let now = 1_800_000_000_000;
  const app = await startApp({ clock: () => now });
  try {
    assert.equal(
      (
        await app.request("/api/profile", {
          method: "PUT",
          body: { nickname: "Test", avatar: { kind: "preset", index: 0 } },
        })
      ).status,
      401,
    );
    const issued = await challenge(app);
    now += 5 * 60 * 1000;
    const signature = await account.signMessage({
      message: issued.body.message,
    });
    assert.equal(
      (
        await app.request("/api/auth/verify", {
          method: "POST",
          body: { message: issued.body.message, signature },
        })
      ).status,
      401,
    );

    const verified = await login(app);
    const cookie = sessionCookie(verified);
    assert.equal(
      (
        await app.request("/api/profile", {
          method: "PUT",
          cookie,
          body: { nickname: "", avatar: { kind: "preset", index: 0 } },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await app.request("/api/profile", {
          method: "PUT",
          cookie,
          body: { nickname: "New\nName", avatar: { kind: "preset", index: 0 } },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await app.request("/api/profile", {
          method: "PUT",
          cookie,
          body: {
            nickname: "New\u202EName",
            avatar: { kind: "preset", index: 0 },
          },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await app.request("/api/profile", {
          method: "PUT",
          cookie,
          body: { nickname: "Test", avatar: { kind: "preset", index: 15 } },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await app.request("/api/profile", {
          method: "PUT",
          cookie,
          body: { nickname: "Test", avatar: { kind: "upload", src: "<svg/>" } },
        })
      ).status,
      400,
    );
  } finally {
    await app.close();
  }
});

test("profile updates are rate-limited per session", async () => {
  const app = await startApp();
  try {
    const cookie = sessionCookie(await login(app));
    for (let index = 0; index < 12; index++) {
      const result = await app.request("/api/profile", {
        method: "PUT",
        cookie,
        body: {
          nickname: `Bird${index}`,
          avatar: { kind: "preset", index: 0 },
        },
      });
      assert.equal(result.status, 200);
    }
    assert.equal(
      (
        await app.request("/api/profile", {
          method: "PUT",
          cookie,
          body: {
            nickname: "Over limit",
            avatar: { kind: "preset", index: 0 },
          },
        })
      ).status,
      429,
    );
  } finally {
    await app.close();
  }
});

test("profile writes require the wallet address to match the authenticated session", async () => {
  const app = await startApp();
  try {
    const cookie = sessionCookie(await login(app, otherAccount));
    const body = {
      nickname: "Other wallet",
      avatar: { kind: "preset", index: 0 },
    };
    const mismatch = await app.request("/api/profile", {
      method: "PUT",
      cookie,
      walletAddress: account.address,
      body,
    });
    assert.equal(mismatch.status, 409);
    assert.deepEqual(mismatch.body, { error: "session_address_mismatch" });
    assert.equal(
      (
        await app.request("/api/profile", {
          method: "PUT",
          cookie,
          omitWalletAddress: true,
          body,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await app.request("/api/profile", {
          method: "PUT",
          cookie,
          walletAddress: "invalid",
          body,
        })
      ).status,
      409,
    );
    const matching = await app.request("/api/profile", {
      method: "PUT",
      cookie,
      walletAddress: otherAccount.address,
      body,
    });
    assert.equal(matching.status, 200);
    assert.equal(matching.body.address, otherAccount.address);
  } finally {
    await app.close();
  }
});

test("avatar image work has a bounded global concurrency and rejects excess uploads", async () => {
  let signalStarted;
  const started = new Promise((resolve) => {
    signalStarted = resolve;
  });
  let unblock;
  const blocked = new Promise((resolve) => {
    unblock = resolve;
  });
  const app = await startApp({
    apiOptions: {
      maxConcurrentAvatarProcessing: 1,
      sanitizeAvatarImage: async () => {
        signalStarted();
        await blocked;
        return { kind: "upload", src: "data:image/png;base64,AA==" };
      },
    },
  });
  try {
    const cookie = sessionCookie(await login(app));
    const request = () =>
      app.request("/api/profile", {
        method: "PUT",
        cookie,
        body: {
          nickname: "Image",
          avatar: { kind: "upload", src: "arbitrary test input" },
        },
      });
    const first = request();
    await started;
    assert.equal((await request()).status, 429);
    unblock();
    assert.equal((await first).status, 200);
  } finally {
    unblock();
    await app.close();
  }
});

test("chain config is Robinhood testnet by default; lands and commerce never invent ownership or sales", async () => {
  const secretRpc = "https://private.example/rpc?secret=do-not-expose";
  const app = await startApp({ env: { CHAIN_RPC_URL: secretRpc } });
  try {
    const config = await app.request("/api/config");
    assert.deepEqual(config.body.chain, {
      id: 46630,
      name: "Robinhood Chain Testnet",
      rpcUrl: "https://rpc.testnet.chain.robinhood.com",
      explorerUrl: "https://explorer.testnet.chain.robinhood.com",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    });
    assert.equal(JSON.stringify(config.body).includes(secretRpc), false);
    assert.equal(config.body.commerce.enabled, false);
    assert.equal(config.body.landContractConfigured, false);
    assert.deepEqual((await app.request("/api/lands")).body, { lands: [] });
    assert.deepEqual((await app.request("/api/lands/1/access")).body, {
      allowed: false,
      reason: "authentication_required",
    });
    const cookie = sessionCookie(await login(app));
    assert.deepEqual(
      (await app.request("/api/lands/1/access", { cookie })).body,
      { allowed: false, reason: "profile_required" },
    );
    assert.equal(
      (
        await app.request("/api/profile", {
          method: "PUT",
          cookie,
          body: { nickname: "Explorer", avatar: { kind: "preset", index: 0 } },
        })
      ).status,
      200,
    );
    assert.deepEqual(
      (await app.request("/api/lands/1/access", { cookie })).body,
      { allowed: false, reason: "land_contract_unconfigured" },
    );
    assert.deepEqual(
      (
        await app.request("/api/lands/1/access", {
          cookie,
          walletAddress: otherAccount.address,
        })
      ).body,
      { allowed: false, reason: "session_address_mismatch" },
    );
    assert.deepEqual(
      (
        await app.request("/api/lands/1/access", {
          cookie,
          omitWalletAddress: true,
        })
      ).body,
      { allowed: false, reason: "session_address_mismatch" },
    );
    assert.equal(
      (await app.request("/api/lands/100001/access", { cookie })).status,
      400,
    );
    assert.equal(
      (await app.request("/api/purchase", { method: "POST" })).status,
      503,
    );
  } finally {
    await app.close();
  }
});

test("land access verifies ERC-721 ownership through a local Robinhood JSON-RPC stub", async () => {
  const tokenAddress = "0x00000000000000000000000000000000000000aa";
  let rpcMode = "ok";
  let ownerAddress = account.address;
  const rpcServer = createServer(async (req, res) => {
    let request;
    try {
      request = JSON.parse(
        await new Promise((resolve, reject) => {
          let body = "";
          req.setEncoding("utf8");
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => resolve(body));
          req.on("error", reject);
        }),
      );
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (rpcMode === "failure") {
      res.writeHead(503).end("RPC unavailable");
      return;
    }
    let result;
    if (request.method === "eth_chainId")
      result = rpcMode === "wrong-chain" ? "0x1" : "0xb626";
    else if (request.method === "eth_getCode")
      result = rpcMode === "empty-code" ? "0x" : "0x6000";
    else if (request.method === "eth_call") {
      assert.equal(request.params[0].to.toLowerCase(), tokenAddress);
      assert.match(request.params[0].data, /^0x6352211e[\da-f]{64}$/i);
      result = `0x${"0".repeat(24)}${ownerAddress.slice(2).toLowerCase()}`;
    } else {
      res.writeHead(200, { "content-type": "application/json" }).end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          error: { code: -32601, message: "Method not found" },
        }),
      );
      return;
    }
    res
      .writeHead(200, { "content-type": "application/json" })
      .end(JSON.stringify({ jsonrpc: "2.0", id: request.id, result }));
  });
  rpcServer.listen(0, "127.0.0.1");
  await once(rpcServer, "listening");
  const rpcUrl = `http://127.0.0.1:${rpcServer.address().port}`;
  const app = await startApp({
    env: { CHAIN_RPC_URL: rpcUrl, LAND_CONTRACT_ADDRESS: tokenAddress },
  });
  try {
    const session = sessionCookie(await login(app));
    const requestAccess = () =>
      app.request("/api/lands/1/access", {
        cookie: session,
        walletAddress: account.address,
      });

    assert.deepEqual((await requestAccess()).body, {
      allowed: false,
      reason: "profile_required",
    });
    assert.equal(
      (
        await app.request("/api/profile", {
          method: "PUT",
          cookie: session,
          body: { nickname: "Owner", avatar: { kind: "preset", index: 1 } },
        })
      ).status,
      200,
    );
    assert.deepEqual((await requestAccess()).body, {
      allowed: true,
      reason: null,
    });

    ownerAddress = otherAccount.address;
    assert.deepEqual((await requestAccess()).body, {
      allowed: false,
      reason: "not_land_owner",
    });

    ownerAddress = account.address;
    rpcMode = "wrong-chain";
    assert.deepEqual((await requestAccess()).body, {
      allowed: false,
      reason: "ownership_unverified",
    });

    rpcMode = "empty-code";
    assert.deepEqual((await requestAccess()).body, {
      allowed: false,
      reason: "ownership_unverified",
    });

    rpcMode = "failure";
    assert.deepEqual((await requestAccess()).body, {
      allowed: false,
      reason: "ownership_unverified",
    });
  } finally {
    await app.close();
    const rpcClosed = once(rpcServer, "close");
    rpcServer.close();
    await rpcClosed;
  }
});

test("explicit mainnet config selects Robinhood Chain 4663 without enabling payments", async () => {
  const app = await startApp({ env: { CHAIN_NETWORK: "mainnet" } });
  try {
    const { chain, commerce } = (await app.request("/api/config")).body;
    assert.deepEqual(chain, {
      id: 4663,
      name: "Robinhood Chain",
      rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
      explorerUrl: "https://robinhoodchain.blockscout.com",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    });
    assert.equal(commerce.enabled, false);
  } finally {
    await app.close();
  }
});

test("expired sessions and oversized profile requests are rejected", async () => {
  let now = 1_800_000_000_000;
  const app = await startApp({ clock: () => now });
  try {
    const cookie = sessionCookie(await login(app));
    now += 12 * 60 * 60 * 1000;
    assert.deepEqual((await app.request("/api/session", { cookie })).body, {
      address: null,
      profile: null,
    });
    const response = await fetch(`${app.origin}/api/profile`, {
      method: "PUT",
      headers: {
        origin: app.origin,
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        nickname: "x".repeat(1_100_000),
        avatar: { kind: "preset", index: 0 },
      }),
    });
    assert.equal(response.status, 413);
  } finally {
    await app.close();
  }
});

test("logout revokes the server-side session and expires its cookie", async () => {
  const app = await startApp();
  try {
    const cookie = sessionCookie(await login(app));
    assert.equal(
      (await app.request("/api/session", { cookie })).body.address,
      account.address,
    );
    const logout = await app.request("/api/auth/logout", {
      method: "POST",
      cookie,
    });
    assert.equal(logout.status, 200);
    assert.match(logout.setCookie, /Max-Age=0/);
    assert.deepEqual((await app.request("/api/session", { cookie })).body, {
      address: null,
      profile: null,
    });
  } finally {
    await app.close();
  }
});
