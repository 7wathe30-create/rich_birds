import { test } from "node:test";
import assert from "node:assert/strict";
import { stringToHex } from "viem";
import {
  chainParameters,
  expectedChainId,
  formatAddress,
  normalizeAccessResult,
  normalizeLands,
  networkLabel,
  parseChainId,
  providerAccounts,
  switchToConfiguredChain,
} from "../src/wallet-client.js";

test("chain IDs parse decimal and EIP-1193 hex values without accepting malformed values", () => {
  assert.equal(parseChainId(1337), 1337);
  assert.equal(parseChainId("1337"), 1337);
  assert.equal(parseChainId("0x539"), 1337);
  for (const value of [
    0,
    -1,
    "0x",
    "0xzz",
    "1.5",
    "",
    null,
    Number.MAX_SAFE_INTEGER + 1,
  ])
    assert.equal(parseChainId(value), null);
  assert.equal(expectedChainId({ id: "0x2105" }), 8453);
  assert.equal(expectedChainId({ chainId: "8453" }), 8453);
});

test("network add parameters use the server-provided exact network details", () => {
  assert.deepEqual(
    chainParameters({
      id: 8453,
      name: "Robinhood Chain Testnet",
      rpcUrl: "https://rpc.example.test",
      explorerUrl: "https://scan.example.test",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    }),
    {
      chainId: "0x2105",
      chainName: "Robinhood Chain Testnet",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://rpc.example.test"],
      blockExplorerUrls: ["https://scan.example.test"],
    },
  );
  assert.throws(
    () => chainParameters({ id: 1, name: "Ethereum" }),
    /полную конфигурацию/,
  );
  assert.equal(
    networkLabel({ name: "Robinhood Chain Testnet" }),
    "Тестовая сеть",
  );
  assert.equal(networkLabel({ name: "Robinhood Chain" }), "Основная сеть");
});

test("wallet helpers format addresses, encode UTF-8 messages, and tolerate invalid provider output", () => {
  const address = `0x${"aB".repeat(20)}`;
  assert.equal(formatAddress(address), "0xaBaB…aBaB");
  assert.equal(formatAddress("0x12"), "");
  assert.deepEqual(providerAccounts([address, 2, null]), [address]);
  assert.equal(
    stringToHex("Rich Birds · вход"),
    `0x${Buffer.from("Rich Birds · вход", "utf8").toString("hex")}`,
  );
});

test("land access always returns an explicit fail-closed result with server reason", () => {
  assert.deepEqual(normalizeAccessResult({ allowed: true }), {
    allowed: true,
    reason: null,
  });
  assert.deepEqual(
    normalizeAccessResult({ allowed: false, reason: "not_land_owner" }),
    { allowed: false, reason: "not_land_owner" },
  );
  assert.deepEqual(normalizeAccessResult(null), {
    allowed: false,
    reason: "access_unverified",
  });
  assert.deepEqual(normalizeAccessResult({ allowed: true }, false), {
    allowed: false,
    reason: "wallet_changed",
  });
});

test("lands expose only the parent-facing parcel identity and optional owner profile fields", () => {
  assert.deepEqual(
    normalizeLands([
      { id: 12, avatar: { kind: "preset", index: 2 }, nickname: "Bird" },
      { id: "13", owner: "ignored", placements: [1] },
      { id: 0, nickname: "invalid" },
      { id: 100001, nickname: "out of map" },
      null,
    ]),
    [
      { id: 12, avatar: { kind: "preset", index: 2 }, nickname: "Bird" },
      { id: 13 },
    ],
  );
  assert.deepEqual(normalizeLands(null), []);
});

test("chain switching adds an unknown exact server-configured chain, switches, and verifies", async () => {
  let chainId = "0x1";
  const calls = [];
  const provider = {
    async request({ method, params }) {
      calls.push({ method, params });
      if (method === "eth_chainId") return chainId;
      if (
        method === "wallet_switchEthereumChain" &&
        calls.filter((call) => call.method === method).length === 1
      )
        throw Object.assign(new Error("unknown chain"), { code: 4902 });
      if (method === "wallet_addEthereumChain") return null;
      if (method === "wallet_switchEthereumChain") chainId = params[0].chainId;
      return null;
    },
  };
  assert.equal(
    await switchToConfiguredChain(provider, {
      id: 46630,
      name: "Robinhood Chain Testnet",
      rpcUrl: "https://rpc.testnet.example",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    }),
    46630,
  );
  assert.deepEqual(
    calls.map(({ method }) => method),
    [
      "eth_chainId",
      "wallet_switchEthereumChain",
      "wallet_addEthereumChain",
      "wallet_switchEthereumChain",
      "eth_chainId",
    ],
  );
  assert.equal(calls[2].params[0].chainId, "0xb626");
  assert.equal(
    calls.some(({ method }) => method === "personal_sign"),
    false,
  );
});

test("chain switching fails closed if wallet declines or remains on another chain", async () => {
  const declined = {
    request: async ({ method }) => {
      if (method === "eth_chainId") return "0x1";
      throw Object.assign(new Error("denied"), { code: 4001 });
    },
  };
  await assert.rejects(
    switchToConfiguredChain(declined, {
      id: 46630,
      name: "Robinhood Chain Testnet",
      rpcUrl: "https://rpc.testnet.example",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    }),
    /denied/,
  );

  const unchanged = {
    request: async ({ method }) => {
      if (method === "eth_chainId") return "0x1";
      if (method === "wallet_switchEthereumChain") return null;
      throw new Error(`unexpected ${method}`);
    },
  };
  await assert.rejects(
    switchToConfiguredChain(unchanged, {
      id: 46630,
      name: "Robinhood Chain Testnet",
      rpcUrl: "https://rpc.testnet.example",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    }),
    /не переключился/,
  );
});
