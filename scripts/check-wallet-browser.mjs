import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { rolldown } from "rolldown";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "wallet-regression";
const origin = process.env.WALLET_BROWSER_URL || "http://localhost:3000/";
const bundlePath = path.join(
  root,
  ".hoplite/artifacts/wallet-browser.fixture.js",
);
const failures = [];

function browserCommand(args, options = {}) {
  let output;
  try {
    output = execFileSync("agent-browser", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 45_000,
      ...options,
    });
  } catch (error) {
    output = error.stdout?.toString() || "";
    try {
      const response = JSON.parse(output);
      throw new Error(
        response.error?.message || JSON.stringify(response.error),
      );
    } catch (parseError) {
      if (parseError instanceof SyntaxError)
        throw new Error(error.stderr?.toString().trim() || error.message);
      throw parseError;
    }
  }
  const response = JSON.parse(output);
  if (!response.success)
    throw new Error(response.error?.message || JSON.stringify(response.error));
  return response.data;
}

function browser(...args) {
  return browserCommand(["--json", "--session", session, ...args]);
}

function runEval(source) {
  return browserCommand(["--json", "--session", session, "eval", "--stdin"], {
    input: source,
  }).result;
}

async function state() {
  return runEval(`(async () => ({
    body: document.body.innerText,
    dialogs: [...document.querySelectorAll('[role="dialog"]')].map((node) => node.innerText),
    links: [...document.querySelectorAll('[role="dialog"] a')].map((node) => ({ text: node.innerText, href: node.href })),
    closeButtons: document.querySelectorAll('[role="dialog"] button[aria-label="Закрыть окно"]').length,
    profileLabel: document.querySelector('header .header-profile')?.getAttribute('aria-label') || '',
    session: await fetch('/api/session', { credentials: 'include' }).then((response) => response.json()),
    calls: window.__walletFixture?.calls || [],
  }))()`);
}

async function waitFor(description, predicate, timeoutMs = 12_000) {
  const end = Date.now() + timeoutMs;
  let latest;
  while (Date.now() < end) {
    latest = await state();
    if (predicate(latest)) return latest;
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(
    `${description} timed out; latest state: ${JSON.stringify({
      dialogs: latest?.dialogs,
      sessionPresent: Boolean(latest?.session?.address),
      personalSignCalls: latest?.calls?.filter(
        (method) => method === "personal_sign",
      ).length,
      body: latest?.body?.slice(-700),
    })}`,
  );
}

async function check(label, run) {
  try {
    await run();
    console.log(`PASS ${label}`);
  } catch (error) {
    failures.push({ label, message: error.message });
    console.error(`FAIL ${label}: ${error.message}`);
  }
}

function clickButton(name) {
  const clicked = runEval(`(() => {
    const button = [...document.querySelectorAll('button')].find((node) =>
      node.innerText.trim().includes(${JSON.stringify(name)}) ||
      node.getAttribute('aria-label')?.includes(${JSON.stringify(name)}),
    );
    if (!button) throw new Error('Button not found: ' + ${JSON.stringify(name)});
    button.click();
    return true;
  })()`);
  assert.equal(clicked, true);
}

function fillPlaceholder(name, value) {
  browser("find", "placeholder", name, "fill", value);
}

async function bundleFixture() {
  await mkdir(path.dirname(bundlePath), { recursive: true });
  const build = await rolldown({
    input: path.join(root, "tests/wallet-browser.fixture.js"),
  });
  const { output } = await build.generate({ format: "iife" });
  const runId = randomUUID();
  const bootstrap = `(() => {
    const marker = '__walletBrowserRun';
    const runId = ${JSON.stringify(runId)};
    if (localStorage.getItem(marker) !== runId) {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem(marker, runId);
    }
  })();\n`;
  await writeFile(bundlePath, `${bootstrap}${output[0].code}`);
  await build.close();
}

async function main() {
  await bundleFixture();
  try {
    browser("close");
  } catch {}
  browser("open", "about:blank");
  browser("cookies", "clear");
  browser("open", origin, "--init-script", bundlePath);
  await waitFor("app startup", (current) =>
    current.body.includes("GENESIS VALLEY"),
  );

  await check(
    "no-wallet picker has install links and cancellation leaves no modal",
    async () => {
      clickButton("Подключить кошелёк");
      const picker = await waitFor(
        "wallet picker",
        (current) => current.dialogs.length > 0,
      );
      assert.match(picker.dialogs.join("\n"), /MetaMask/);
      assert.match(picker.dialogs.join("\n"), /Rabby/);
      assert.ok(
        picker.links.some(({ href }) => href.includes("metamask.io")),
        "MetaMask install link missing",
      );
      assert.ok(
        picker.links.some(({ href }) => href.includes("rabby.io")),
        "Rabby install link missing",
      );
      clickButton("Close");
      const cancelled = await waitFor(
        "wallet picker cancellation",
        (current) => current.dialogs.length === 0,
      );
      assert.equal(
        cancelled.session.address,
        null,
        "cancel unexpectedly authenticated a wallet",
      );
    },
  );

  runEval(`window.__walletFixture.setAvailable(true); true`);
  browser("reload");
  await waitFor("test wallet discovery", (current) =>
    current.body.includes("GENESIS VALLEY"),
  );
  runEval(`window.__walletFixture.rejectSignature(true); true`);

  await check(
    "one wallet choice prompts for a signature; rejection leaves no session and retry works",
    async () => {
      clickButton("Подключить кошелёк");
      const picker = await waitFor("test wallet picker", (current) =>
        current.dialogs.some((text) => text.includes("Rich Birds Test Wallet")),
      );
      assert.equal(
        picker.dialogs.filter((text) => text.includes("Rich Birds Test Wallet"))
          .length,
        1,
      );
      clickButton("Rich Birds Test Wallet");
      const rejected = await waitFor(
        "signature rejection",
        (current) =>
          current.calls.filter((method) => method === "personal_sign")
            .length === 1 &&
          current.body.includes("Подтвердите вход") &&
          !current.session.address,
      );
      assert.equal(rejected.session.address, null);
      runEval(`window.__walletFixture.rejectSignature(false); true`);
      clickButton("Войти по подписи");
      await waitFor("first-login registration", (current) =>
        current.dialogs.some((text) => text.includes("Создать профиль")),
      );
      const registered = await state();
      assert.equal(
        registered.calls.filter((method) => method === "personal_sign").length,
        2,
        "each explicit sign-in attempt should call personal_sign exactly once",
      );
      assert.ok(
        registered.session.address,
        "successful signature did not create a session",
      );
      assert.equal(
        registered.session.profile,
        null,
        "new wallet already has a profile",
      );
    },
  );

  const nickname = `Browser${Math.random().toString(36).slice(2, 8)}`;
  await check(
    "registration is mandatory and cannot save a nickname without an avatar",
    async () => {
      const registration = await waitFor("registration dialog", (current) =>
        current.dialogs.some((text) => text.includes("Создать профиль")),
      );
      assert.equal(
        registration.closeButtons,
        0,
        "mandatory registration has a close button",
      );
      browser("press", "Escape");
      assert.ok(
        (await state()).dialogs.some((text) =>
          text.includes("Создать профиль"),
        ),
        "Escape dismissed mandatory registration",
      );
      fillPlaceholder("Например, PixelExplorer", nickname);
      clickButton("Создать профиль");
      const invalid = await waitFor("avatar validation", (current) =>
        current.dialogs.some((text) => /аватар|геро/i.test(text)),
      );
      assert.equal(
        invalid.session.profile,
        null,
        "profile without avatar was persisted",
      );
    },
  );

  await check(
    "new registration saves nickname and preset avatar to the session API",
    async () => {
      const chosen = runEval(
        `(() => { const button = document.querySelector('[aria-label^="Выбрать аватар "]'); if (!button) throw new Error('preset avatar button missing'); button.click(); return button.getAttribute('aria-label'); })()`,
      );
      assert.ok(chosen, "preset avatar was not selected");
      clickButton("Создать профиль");
      const saved = await waitFor(
        "saved profile",
        (current) =>
          current.session?.profile?.nickname === nickname &&
          current.session.profile.avatar?.kind === "preset",
      );
      assert.equal(saved.session.profile.avatar.kind, "preset");
      assert.equal(saved.session.profile.avatar.index, 0);
    },
  );

  await check(
    "disconnect and reconnect restores the saved profile without re-registration",
    async () => {
      const originalAddress = (await state()).session.address;
      assert.ok(originalAddress, "precondition: no authenticated session");
      runEval(`document.querySelector('header button.connect')?.click(); true`);
      await waitFor("authenticated wallet panel", (current) =>
        current.dialogs.some((text) => text.includes("Отключить")),
      );
      clickButton("Отключить");
      await waitFor(
        "disconnected session",
        (current) => current.session.address === null,
      );
      clickButton("Подключить кошелёк");
      const picker = await waitFor("reconnect wallet picker", (current) =>
        current.dialogs.some((text) => text.includes("Rich Birds Test Wallet")),
      );
      clickButton("Rich Birds Test Wallet");
      const reconnected = await waitFor(
        "existing profile after reconnect",
        (current) =>
          current.session?.profile?.nickname === nickname &&
          current.profileLabel.includes(nickname),
      );
      assert.equal(
        reconnected.session.address.toLowerCase(),
        originalAddress.toLowerCase(),
      );
      assert.equal(
        reconnected.dialogs.some((text) => text.includes("Создать профиль")),
        false,
      );
      assert.equal(
        reconnected.calls.filter((method) => method === "personal_sign").length,
        3,
        "reconnecting an existing profile should require exactly one new login signature",
      );
    },
  );

  await check(
    "reload restores the existing login without requesting another signature",
    async () => {
      browser("reload");
      const restored = await waitFor(
        "restored profile",
        (current) =>
          current.session?.profile?.nickname === nickname &&
          current.profileLabel.includes(nickname) &&
          current.calls.filter((method) => method === "personal_sign")
            .length === 0,
      );
      assert.equal(restored.session.profile.nickname, nickname);
    },
  );

  await check("chain change revokes the active server session", async () => {
    assert.ok(
      (await state()).session.address,
      "precondition: no authenticated session",
    );
    runEval(`window.__walletFixture.changeChain('0x1'); true`);
    const revoked = await waitFor(
      "chain-change logout",
      (current) => current.session.address === null,
    );
    assert.equal(revoked.session.profile, null);
    runEval(`window.__walletFixture.changeChain('0xb626'); true`);
    clickButton("Подключить кошелёк");
    await waitFor(
      "same-account login after chain reset",
      (current) => current.session?.profile?.nickname === nickname,
    );
  });

  await check("account change revokes the authenticated session", async () => {
    assert.ok(
      (await state()).session.address,
      "precondition: no authenticated session",
    );
    runEval(`window.__walletFixture.changeAccount(); true`);
    const revoked = await waitFor(
      "account-change logout",
      (current) => current.session.address === null,
    );
    assert.equal(revoked.session.profile, null);
  });

  if (failures.length) {
    console.error(`\n${failures.length} browser check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log("\nAll wallet browser checks passed.");
  }
}

main().catch((error) => {
  console.error(
    `Wallet browser check could not complete: ${error.stack || error.message}`,
  );
  process.exitCode = 1;
});
