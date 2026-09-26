import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

// Ephemeral signer for browser checks; never connects to an RPC or sends funds.
const accountKey =
  sessionStorage.getItem("walletFixtureKey") || generatePrivateKey();
sessionStorage.setItem("walletFixtureKey", accountKey);
const originalAccount = privateKeyToAccount(accountKey);
let account = originalAccount;
let active = [account.address];
let chainId = sessionStorage.getItem("walletFixtureChain") || "0x1";
let rejectSignature = false;
let available = sessionStorage.getItem("walletFixtureAvailable") === "1";
let granted = sessionStorage.getItem("walletFixtureGranted") === "1";
const listeners = new Map();
const calls = [];
const uuid = crypto.randomUUID();
const emit = (type, value) => listeners.get(type)?.forEach((fn) => fn(value));
const provider = {
  on(type, fn) {
    listeners.set(type, [...(listeners.get(type) || []), fn]);
  },
  removeListener(type, fn) {
    listeners.set(
      type,
      (listeners.get(type) || []).filter((item) => item !== fn),
    );
  },
  async request({ method, params }) {
    calls.push(method);
    if (method === "eth_requestAccounts") {
      granted = true;
      sessionStorage.setItem("walletFixtureGranted", "1");
      return active;
    }
    if (method === "eth_accounts") return granted ? active : [];
    if (method === "eth_chainId") return chainId;
    if (method === "wallet_switchEthereumChain") {
      chainId = params[0].chainId;
      sessionStorage.setItem("walletFixtureChain", chainId);
      emit("chainChanged", chainId);
      return null;
    }
    if (
      method === "wallet_addEthereumChain" ||
      method === "wallet_revokePermissions"
    )
      return null;
    if (method === "wallet_requestPermissions")
      return [{ parentCapability: "eth_accounts" }];
    if (method === "personal_sign") {
      if (rejectSignature)
        throw Object.assign(new Error("User rejected signature"), {
          code: 4001,
        });
      return account.signMessage({ message: { raw: params[0] } });
    }
    throw new Error(`Unexpected wallet operation: ${method}`);
  },
};
const announce = () => {
  if (!available) return;
  window.dispatchEvent(
    new CustomEvent("eip6963:announceProvider", {
      detail: {
        info: {
          uuid,
          name: "Rich Birds Test Wallet",
          icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='%23e9c658'/></svg>",
          rdns: "test.richbirds.wallet",
        },
        provider,
      },
    }),
  );
};
window.__walletFixture = {
  calls,
  announce,
  setAvailable(value) {
    available = value;
    sessionStorage.setItem("walletFixtureAvailable", value ? "1" : "0");
    if (value) announce();
  },
  persistTestState() {
    sessionStorage.setItem("walletFixtureKey", accountKey);
    sessionStorage.setItem("walletFixtureChain", chainId);
    sessionStorage.setItem("walletFixtureAvailable", available ? "1" : "0");
    sessionStorage.setItem("walletFixtureGranted", granted ? "1" : "0");
  },
  rejectSignature(value) {
    rejectSignature = value;
  },
  changeAccount() {
    account = privateKeyToAccount(generatePrivateKey());
    active = [account.address];
    emit("accountsChanged", active);
  },
  changeChain(value = "0x1") {
    chainId = value;
    sessionStorage.setItem("walletFixtureChain", chainId);
    emit("chainChanged", chainId);
  },
};
window.addEventListener("eip6963:requestProvider", announce);
announce();
