import { createHash, randomBytes } from "node:crypto";
import {
  isAddress,
  getAddress,
  verifyMessage,
  createPublicClient,
  http,
  defineChain,
} from "viem";
import sharp from "sharp";
import { createDatabase } from "./database.js";

const BODY_LIMIT = 1024 * 1024;
const CHALLENGE_TTL = 5 * 60 * 1000;
const SESSION_TTL = 12 * 60 * 60 * 1000;
const LAND_SUPPLY = 100_000;
const AVATAR_COUNT = 15;
const LAND_ABI = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
];

const NETWORKS = {
  testnet: {
    id: 46630,
    name: "Robinhood Chain Testnet",
    rpcUrl: "https://rpc.testnet.chain.robinhood.com",
    explorerUrl: "https://explorer.testnet.chain.robinhood.com",
  },
  mainnet: {
    id: 4663,
    name: "Robinhood Chain",
    rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
    explorerUrl: "https://robinhoodchain.blockscout.com",
  },
};

function json(res, status, value, headers = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...headers,
  });
  res.end(JSON.stringify(value));
}

function cookieValue(header, name) {
  for (const part of (header || "").split(";")) {
    const index = part.indexOf("=");
    if (index > 0 && part.slice(0, index).trim() === name)
      return part.slice(index + 1).trim();
  }
  return "";
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function safeProfile(row) {
  return row
    ? { nickname: row.nickname, avatar: JSON.parse(row.avatar_json) }
    : null;
}

function parseImage(value) {
  if (typeof value !== "string") throw new Error("invalid_avatar");
  const match = value.match(
    /^(?:data:image\/png;base64,)?([A-Za-z0-9+/]+={0,2})$/,
  );
  if (!match || match[1].length % 4 !== 0 || match[1].length > 900_000)
    throw new Error("invalid_avatar");
  const buffer = Buffer.from(match[1], "base64");
  if (!buffer.length || buffer.toString("base64") !== match[1])
    throw new Error("invalid_avatar");
  return buffer;
}

async function sanitizeAvatar(avatar) {
  if (!avatar || typeof avatar !== "object" || Array.isArray(avatar))
    throw new Error("invalid_avatar");
  if (
    avatar.kind === "preset" &&
    Number.isInteger(avatar.index) &&
    avatar.index >= 0 &&
    avatar.index < AVATAR_COUNT
  ) {
    return { kind: "preset", index: avatar.index };
  }
  if (avatar.kind !== "upload") throw new Error("invalid_avatar");
  const input = parseImage(avatar.src);
  const image = sharp(input, {
    limitInputPixels: 20_000_000,
    animated: false,
    failOn: "error",
  });
  const metadata = await image.metadata();
  if (
    metadata.format !== "png" ||
    !metadata.width ||
    !metadata.height ||
    metadata.width * metadata.height > 20_000_000 ||
    (metadata.pages ?? 1) !== 1
  ) {
    throw new Error("invalid_avatar");
  }
  const output = await image
    .resize(256, 256, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  return {
    kind: "upload",
    src: `data:image/png;base64,${output.toString("base64")}`,
  };
}

async function readJson(req) {
  const type = req.headers["content-type"] || "";
  if (!/^application\/json(?:\s*;|$)/i.test(type))
    throw Object.assign(new Error("json_required"), { status: 415 });
  const declared = Number(req.headers["content-length"] || 0);
  if (declared > BODY_LIMIT)
    throw Object.assign(new Error("body_too_large"), { status: 413 });
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT)
      throw Object.assign(new Error("body_too_large"), { status: 413 });
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value;
  } catch {
    throw Object.assign(new Error("invalid_json"), { status: 400 });
  }
}

function profileFor(db, address) {
  return safeProfile(
    db
      .prepare("SELECT nickname, avatar_json FROM profiles WHERE address = ?")
      .get(address),
  );
}

function exactOrigin(value) {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol) || url.origin !== value)
    throw new TypeError();
  return url.origin;
}

export function createApiHandler({
  dbPath = process.env.DATABASE_PATH || "data/rich-birds.sqlite",
  appOrigin = process.env.APP_ORIGIN || "http://localhost:3000",
  env = process.env,
  clock = Date.now,
  database,
  maxConcurrentAvatarProcessing = 2,
  sanitizeAvatarImage = sanitizeAvatar,
} = {}) {
  let origin;
  try {
    origin = exactOrigin(appOrigin);
  } catch {
    throw new TypeError(
      "APP_ORIGIN must be an exact http(s) origin, without a path",
    );
  }
  const allowedOrigins = new Set([origin]);
  for (const candidate of (env.APP_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)) {
    try {
      allowedOrigins.add(exactOrigin(candidate));
    } catch {
      throw new TypeError(
        "APP_ALLOWED_ORIGINS must contain only exact http(s) origins",
      );
    }
  }
  const network = NETWORKS[env.CHAIN_NETWORK || "testnet"];
  if (!network) throw new TypeError("CHAIN_NETWORK must be testnet or mainnet");
  const db = database || createDatabase(dbPath);
  const chain = defineChain({
    id: network.id,
    name: network.name,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [env.CHAIN_RPC_URL || network.rpcUrl] } },
    blockExplorers: { default: { name: "Explorer", url: network.explorerUrl } },
  });
  const rpcUrl = env.CHAIN_RPC_URL || network.rpcUrl;
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl, { timeout: 5000, retryCount: 0 }),
  });
  const contractAddress =
    typeof env.LAND_CONTRACT_ADDRESS === "string" &&
    isAddress(env.LAND_CONTRACT_ADDRESS)
      ? getAddress(env.LAND_CONTRACT_ADDRESS)
      : null;
  const limits = new Map();
  let activeAvatarProcessing = 0;
  const cookieSuffix = (requestOrigin) =>
    `; Path=/; HttpOnly; SameSite=Strict${requestOrigin.startsWith("https://") ? "; Secure" : ""}`;

  function allowedWrite(req) {
    return (
      typeof req.headers.origin === "string" &&
      allowedOrigins.has(req.headers.origin)
    );
  }

  function rateLimited(req, name, max) {
    return rateLimitedKey(
      `${name}:${req.socket.remoteAddress || "unknown"}`,
      max,
    );
  }

  function rateLimitedKey(key, max) {
    const now = clock();
    const entry = limits.get(key);
    if (!entry || now - entry.start >= 60_000) {
      limits.set(key, { start: now, count: 1 });
      return false;
    }
    entry.count++;
    if (limits.size > 10_000) {
      for (const [id, value] of limits)
        if (now - value.start > 60_000) limits.delete(id);
    }
    return entry.count > max;
  }

  function authenticated(req) {
    const token = cookieValue(req.headers.cookie, "rb_session");
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    const hash = hashToken(token);
    const now = clock();
    const session = db
      .prepare(
        "SELECT address FROM auth_sessions WHERE token_hash = ? AND expires_at > ?",
      )
      .get(hash, now);
    if (!session) {
      db.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").run(hash);
      return null;
    }
    return {
      address: getAddress(session.address),
      profile: profileFor(db, session.address),
    };
  }

  function walletMatchesSession(req, session) {
    const requestedAddress = req.headers["x-wallet-address"];
    return (
      typeof requestedAddress === "string" &&
      isAddress(requestedAddress) &&
      getAddress(requestedAddress) === session.address
    );
  }

  return async function handleApi(req, res) {
    const url = new URL(req.url, origin);
    if (!url.pathname.startsWith("/api/")) return false;
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        allow: "GET, POST, PUT, OPTIONS",
        "cache-control": "no-store",
      });
      res.end();
      return true;
    }
    if (req.method === "GET" && url.pathname === "/api/config") {
      let landContractConfigured = false;
      if (contractAddress) {
        try {
          const [chainId, code] = await Promise.all([
            publicClient.getChainId(),
            publicClient.getBytecode({ address: contractAddress }),
          ]);
          landContractConfigured =
            chainId === network.id && Boolean(code && code !== "0x");
        } catch {
          landContractConfigured = false;
        }
      }
      json(res, 200, {
        chain: {
          id: network.id,
          name: network.name,
          rpcUrl: network.rpcUrl,
          explorerUrl: network.explorerUrl,
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        },
        commerce: {
          enabled: false,
          reason:
            "Покупки недоступны до утверждения и настройки контрактов и оплаты.",
        },
        landContractConfigured,
      });
      return true;
    }
    if (req.method === "GET" && url.pathname === "/api/session") {
      const session = authenticated(req);
      json(res, 200, {
        address: session?.address || null,
        profile: session?.profile || null,
      });
      return true;
    }
    if (req.method === "GET" && url.pathname === "/api/lands") {
      json(res, 200, { lands: [] });
      return true;
    }
    const landMatch =
      req.method === "GET" &&
      url.pathname.match(/^\/api\/lands\/(\d+)\/access$/);
    if (landMatch) {
      const id = Number(landMatch[1]);
      const session = authenticated(req);
      if (!Number.isSafeInteger(id) || id < 1 || id > LAND_SUPPLY) {
        json(res, 400, { error: "invalid_land_id" });
      } else if (!session) {
        json(res, 200, { allowed: false, reason: "authentication_required" });
      } else if (!walletMatchesSession(req, session)) {
        json(res, 200, { allowed: false, reason: "session_address_mismatch" });
      } else if (!contractAddress) {
        json(res, 200, {
          allowed: false,
          reason: "land_contract_unconfigured",
        });
      } else {
        try {
          if ((await publicClient.getChainId()) !== network.id)
            throw new Error("rpc_chain_mismatch");
          const code = await publicClient.getBytecode({
            address: contractAddress,
          });
          if (!code || code === "0x") throw new Error("contract_not_deployed");
          const owner = await publicClient.readContract({
            address: contractAddress,
            abi: LAND_ABI,
            functionName: "ownerOf",
            args: [BigInt(id)],
          });
          const allowed = getAddress(owner) === session.address;
          json(res, 200, {
            allowed,
            reason: allowed ? null : "not_land_owner",
          });
        } catch {
          json(res, 200, { allowed: false, reason: "ownership_unverified" });
        }
      }
      return true;
    }
    if (req.method === "POST" && url.pathname === "/api/purchase") {
      json(res, 503, {
        error: "commerce_unavailable",
        reason:
          "Покупки отключены: контракт и платёжная конфигурация не утверждены.",
      });
      return true;
    }
    if (!["POST", "PUT"].includes(req.method)) {
      json(
        res,
        405,
        { error: "method_not_allowed" },
        { allow: "GET, POST, PUT, OPTIONS" },
      );
      return true;
    }
    if (!allowedWrite(req)) {
      json(res, 403, { error: "origin_not_allowed" });
      return true;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/logout") {
      const token = cookieValue(req.headers.cookie, "rb_session");
      if (/^[a-f0-9]{64}$/.test(token))
        db.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").run(
          hashToken(token),
        );
      json(
        res,
        200,
        { ok: true },
        {
          "set-cookie": `rb_session=; Max-Age=0${cookieSuffix(req.headers.origin)}`,
        },
      );
      return true;
    }
    let profileSession = null;
    if (req.method === "PUT" && url.pathname === "/api/profile") {
      if (Number(req.headers["content-length"] || 0) > BODY_LIMIT) {
        json(res, 413, { error: "body_too_large" });
        return true;
      }
      profileSession = authenticated(req);
      if (!profileSession) {
        json(res, 401, { error: "authentication_required" });
        return true;
      }
      if (!walletMatchesSession(req, profileSession)) {
        json(res, 409, { error: "session_address_mismatch" });
        return true;
      }
      if (
        rateLimited(req, "profile-ip", 30) ||
        rateLimitedKey(
          `profile-session:${profileSession.address.toLowerCase()}`,
          12,
        )
      ) {
        json(res, 429, { error: "rate_limited" });
        return true;
      }
    }
    const body = await readJson(req).catch((error) => {
      json(res, error.status || 400, {
        error:
          error.message === "json_required"
            ? error.message
            : error.status === 413
              ? "body_too_large"
              : "invalid_json",
      });
      return null;
    });
    if (!body) return true;

    if (req.method === "POST" && url.pathname === "/api/auth/challenge") {
      if (rateLimited(req, "challenge", 20)) {
        json(res, 429, { error: "rate_limited" });
        return true;
      }
      if (
        typeof body.address !== "string" ||
        !isAddress(body.address) ||
        body.chainId !== network.id
      ) {
        json(res, 400, { error: "invalid_address_or_chain" });
        return true;
      }
      const address = getAddress(body.address);
      const now = clock();
      const nonce = randomBytes(16).toString("hex");
      const challengeToken = randomBytes(32).toString("hex");
      const issuedAt = new Date(now).toISOString();
      const expiresAt = new Date(now + CHALLENGE_TTL).toISOString();
      const requestOrigin = req.headers.origin;
      const message = `${new URL(requestOrigin).host} wants you to sign in with your Ethereum account:\n${address}\n\nSign in to Rich Birds.\n\nURI: ${requestOrigin}\nVersion: 1\nChain ID: ${network.id}\nNonce: ${nonce}\nIssued At: ${issuedAt}\nExpiration Time: ${expiresAt}`;
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare("DELETE FROM auth_challenges WHERE expires_at <= ?").run(
          now,
        );
        db.prepare(
          "INSERT INTO auth_challenges(nonce, address, chain_id, origin, message, challenge_token_hash, expires_at, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?)",
        ).run(
          nonce,
          address,
          network.id,
          requestOrigin,
          message,
          hashToken(challengeToken),
          now + CHALLENGE_TTL,
          now,
        );
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      json(
        res,
        200,
        { message },
        {
          "set-cookie": `rb_challenge=${challengeToken}${cookieSuffix(requestOrigin)}; Max-Age=${CHALLENGE_TTL / 1000}`,
        },
      );
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/verify") {
      if (rateLimited(req, "verify", 30)) {
        json(res, 429, { error: "rate_limited" });
        return true;
      }
      if (
        typeof body.message !== "string" ||
        typeof body.signature !== "string" ||
        !/^0x[\da-fA-F]{130}$/.test(body.signature)
      ) {
        json(res, 400, { error: "invalid_signature" });
        return true;
      }
      const nonce = body.message.match(/^Nonce: ([a-f0-9]{32})$/m)?.[1];
      const challengeToken = cookieValue(req.headers.cookie, "rb_challenge");
      const challenge =
        nonce &&
        db
          .prepare(
            `DELETE FROM auth_challenges
        WHERE nonce = ? AND message = ? AND origin = ? AND chain_id = ? AND challenge_token_hash = ? AND expires_at > ?
        RETURNING *`,
          )
          .get(
            nonce,
            body.message,
            req.headers.origin,
            network.id,
            hashToken(challengeToken),
            clock(),
          );
      if (!challenge) {
        json(res, 401, { error: "challenge_invalid_or_expired" });
        return true;
      }
      let valid = false;
      try {
        valid = await verifyMessage({
          address: challenge.address,
          message: challenge.message,
          signature: body.signature,
        });
      } catch {
        valid = false;
      }
      if (!valid) {
        json(res, 401, { error: "signature_invalid" });
        return true;
      }
      const token = randomBytes(32).toString("hex");
      const now = clock();
      db.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").run(now);
      db.prepare(
        "INSERT INTO auth_sessions(token_hash, address, expires_at, created_at) VALUES(?, ?, ?, ?)",
      ).run(hashToken(token), challenge.address, now + SESSION_TTL, now);
      json(
        res,
        200,
        {
          address: getAddress(challenge.address),
          profile: profileFor(db, challenge.address),
        },
        {
          "set-cookie": [
            `rb_session=${token}${cookieSuffix(challenge.origin)}; Max-Age=${SESSION_TTL / 1000}`,
            `rb_challenge=; Max-Age=0${cookieSuffix(challenge.origin)}`,
          ],
        },
      );
      return true;
    }

    if (req.method === "PUT" && url.pathname === "/api/profile") {
      if (
        typeof body.nickname !== "string" ||
        !body.nickname.trim() ||
        [...body.nickname.trim()].length > 24
      ) {
        json(res, 400, { error: "invalid_nickname" });
        return true;
      }
      const nickname = body.nickname.trim();
      if (/[\p{Cc}\p{Cf}]/u.test(nickname)) {
        json(res, 400, { error: "invalid_nickname" });
        return true;
      }
      const isUpload = body.avatar?.kind === "upload";
      if (isUpload && activeAvatarProcessing >= maxConcurrentAvatarProcessing) {
        json(res, 429, { error: "avatar_processing_busy" });
        return true;
      }
      let avatar;
      try {
        if (isUpload) activeAvatarProcessing++;
        avatar = await sanitizeAvatarImage(body.avatar);
      } catch {
        json(res, 400, { error: "invalid_avatar" });
        return true;
      } finally {
        if (isUpload) activeAvatarProcessing--;
      }
      db.prepare(
        `INSERT INTO profiles(address, nickname, avatar_json, updated_at) VALUES(?, ?, ?, ?)
        ON CONFLICT(address) DO UPDATE SET nickname = excluded.nickname, avatar_json = excluded.avatar_json, updated_at = excluded.updated_at`,
      ).run(
        profileSession.address,
        nickname,
        JSON.stringify(avatar),
        new Date(clock()).toISOString(),
      );
      json(res, 200, {
        address: profileSession.address,
        profile: { nickname, avatar },
      });
      return true;
    }

    json(res, 404, { error: "not_found" });
    return true;
  };
}

export const authConstants = Object.freeze({
  challengeTtlMs: CHALLENGE_TTL,
  sessionTtlMs: SESSION_TTL,
});
