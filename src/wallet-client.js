export function parseChainId(value) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0)
    return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = /^0x[\da-f]+$/i.test(value)
    ? Number.parseInt(value, 16)
    : /^\d+$/.test(value)
      ? Number(value)
      : NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function expectedChainId(chain) {
  return parseChainId(chain?.id ?? chain?.chainId);
}

export function formatAddress(address) {
  return typeof address === "string" && /^0x[\da-f]{40}$/i.test(address)
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "";
}

export function networkLabel(chain) {
  if (chain?.testnet === true || /test|sepolia|hoodi/i.test(chain?.name || ""))
    return "Тестовая сеть";
  return "Основная сеть";
}

export function providerAccounts(value) {
  return Array.isArray(value)
    ? value.filter((account) => typeof account === "string")
    : [];
}

export function normalizeAccessResult(result, current = true) {
  if (!current) return { allowed: false, reason: "wallet_changed" };
  return {
    allowed: result?.allowed === true,
    reason:
      result?.allowed === true ? null : result?.reason || "access_unverified",
  };
}

export function normalizeLands(lands) {
  if (!Array.isArray(lands)) return [];
  return lands
    .filter(
      (land) =>
        land &&
        Number.isSafeInteger(Number(land.id)) &&
        Number(land.id) > 0 &&
        Number(land.id) <= 100000 &&
        (typeof land.id === "number" || /^\d+$/.test(land.id)),
    )
    .map(({ id, avatar, nickname }) => ({
      id: Number(id),
      ...(avatar == null ? {} : { avatar }),
      ...(typeof nickname === "string" ? { nickname } : {}),
    }));
}

export function chainParameters(chain) {
  const id = expectedChainId(chain);
  if (
    !id ||
    !chain?.name ||
    !chain?.rpcUrl ||
    !chain?.nativeCurrency?.name ||
    !chain?.nativeCurrency?.symbol ||
    !Number.isInteger(chain?.nativeCurrency?.decimals)
  )
    throw new Error("Сервер не передал полную конфигурацию сети кошелька.");
  const parameters = {
    chainId: `0x${id.toString(16)}`,
    chainName: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: [chain.rpcUrl],
  };
  if (chain.explorerUrl) parameters.blockExplorerUrls = [chain.explorerUrl];
  return parameters;
}

export async function switchToConfiguredChain(provider, chain) {
  const parameters = chainParameters(chain);
  const expected = expectedChainId(chain);
  let actual = parseChainId(await provider.request({ method: "eth_chainId" }));
  if (actual === expected) return actual;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: parameters.chainId }],
    });
  } catch (error) {
    if (error?.code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [parameters],
    });
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: parameters.chainId }],
    });
  }
  actual = parseChainId(await provider.request({ method: "eth_chainId" }));
  if (actual !== expected)
    throw new Error("Кошелёк не переключился на настроенную сеть.");
  return actual;
}
