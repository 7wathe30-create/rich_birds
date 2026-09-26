import React, { useCallback, useEffect, useRef, useState } from "react";
import { isAddress, stringToHex } from "viem";
import { useWalletConnector } from "./wallet-kit.jsx";
import {
  expectedChainId,
  formatAddress,
  normalizeAccessResult,
  normalizeLands,
  networkLabel,
  parseChainId,
  providerAccounts,
  switchToConfiguredChain,
} from "./wallet-client.js";

const API = "/api";

async function requestJson(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body.error || body.message || "";
    } catch {}
    throw new Error(detail || `Запрос не выполнен (${response.status}).`);
  }
  if (response.status === 204) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function walletError(error) {
  const messages = {
    invalid_address_or_chain:
      "Адрес или сеть не совпадают с настройками сервера. Переподключите кошелёк.",
    invalid_signature: "Кошелёк вернул некорректную подпись. Повторите вход.",
    challenge_invalid_or_expired:
      "Сообщение для входа истекло. Запросите подпись ещё раз.",
    signature_invalid:
      "Подпись не подтверждена. Убедитесь, что подписываете сообщение этим кошельком.",
    authentication_required: "Войдите по подписи кошелька, чтобы продолжить.",
    profile_required: "Завершите регистрацию: укажите ник и аватар.",
    invalid_nickname: "Ник должен содержать от 1 до 24 символов.",
    invalid_avatar:
      "Не удалось сохранить аватар. Выберите корректное изображение.",
    rate_limited:
      "Слишком много запросов. Подождите немного и повторите попытку.",
    origin_not_allowed: "Сервер отклонил запрос с этого адреса сайта.",
    avatar_processing_busy:
      "Сервер обрабатывает изображения. Попробуй сохранить ещё раз через несколько секунд.",
    session_address_mismatch:
      "В другой вкладке выбран другой кошелёк. Войди заново перед сохранением.",
  };
  if (messages[error?.message]) return messages[error.message];
  if (error?.code === 4001 || error?.code === "ACTION_REJECTED")
    return "Запрос отклонён в кошельке. Подтвердите действие, чтобы продолжить.";
  if (error?.code === 4902)
    return "Не удалось добавить целевую сеть в кошелёк. Проверьте настройки сети.";
  if (/user rejected|user denied|request rejected/i.test(error?.message || ""))
    return "Запрос отклонён в кошельке. Подтвердите действие, чтобы продолжить.";
  return (
    error?.message ||
    "Не удалось выполнить запрос кошелька. Попробуйте ещё раз."
  );
}

function validAddress(value) {
  return typeof value === "string" && isAddress(value);
}

function payloadAddress(payload) {
  return validAddress(payload?.address) ? payload.address : null;
}

function networkStatus(chain) {
  if (!chain) return "Сеть не подтверждена";
  const target = `${networkLabel(chain)} · ${chain.name}`;
  if (chain.connectedChainId == null)
    return `Сеть не подтверждена · целевая: ${target}`;
  if (chain.connectedChainId !== chain.expectedChainId)
    return `Не та сеть · целевая: ${target}`;
  return target;
}

export function useWallet() {
  const connector = useWalletConnector();
  const [config, setConfig] = useState(null);
  const [address, setAddress] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [chain, setChain] = useState(null);
  const [lands, setLands] = useState([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const configRef = useRef(null);
  const providerRef = useRef(null);
  const providerCleanupRef = useRef(null);
  const epochRef = useRef(0);
  const busyRef = useRef(false);
  const connectionAttempt = useRef(null);
  const logoutRef = useRef(Promise.resolve());
  const revokeSession = useCallback(() => {
    logoutRef.current = logoutRef.current
      .catch(() => {})
      .then(() => requestJson("/auth/logout", { method: "POST" }));
    return logoutRef.current;
  }, []);

  const updateConfig = useCallback((next) => {
    configRef.current = next;
    setConfig(next);
    setChain((current) =>
      next?.chain
        ? {
            ...next.chain,
            expectedChainId: expectedChainId(next.chain),
            connectedChainId: current?.connectedChainId ?? null,
          }
        : current,
    );
  }, []);

  const endBusy = useCallback(() => {
    busyRef.current = false;
    setBusy(false);
  }, []);

  const clearIdentity = useCallback((nextAddress = null, nextChain = null) => {
    epochRef.current++;
    setAddress(nextAddress);
    const configuredChain = configRef.current?.chain;
    setChain(
      nextChain ||
        (configuredChain
          ? {
              ...configuredChain,
              expectedChainId: expectedChainId(configuredChain),
              connectedChainId: null,
            }
          : null),
    );
    setProfile(null);
    setAuthenticated(false);
    setLands([]);
  }, []);

  const bindProvider = useCallback(
    (provider) => {
      if (!provider || providerRef.current === provider) return;
      providerCleanupRef.current?.();
      providerRef.current = provider;
      const accountsChanged = (accounts) => {
        const first = providerAccounts(accounts)[0];
        if (
          connectionAttempt.current?.address &&
          first?.toLowerCase() !==
            connectionAttempt.current.address.toLowerCase()
        )
          connectionAttempt.current.invalid = true;
        clearIdentity(validAddress(first) ? first : null, null);
        revokeSession().catch(() => {});
      };
      const chainChanged = (chainId) => {
        const parsed = parseChainId(chainId);
        const expected = configRef.current?.chain;
        if (connectionAttempt.current && parsed !== expectedChainId(expected))
          connectionAttempt.current.invalid = true;
        clearIdentity(
          null,
          parsed
            ? {
                ...expected,
                expectedChainId: expectedChainId(expected),
                connectedChainId: parsed,
              }
            : null,
        );
        revokeSession().catch(() => {});
      };
      const disconnected = () => {
        if (connectionAttempt.current) connectionAttempt.current.invalid = true;
        clearIdentity();
        revokeSession().catch(() => {});
      };
      provider.on?.("accountsChanged", accountsChanged);
      provider.on?.("chainChanged", chainChanged);
      provider.on?.("disconnect", disconnected);
      providerCleanupRef.current = () => {
        provider.removeListener?.("accountsChanged", accountsChanged);
        provider.removeListener?.("chainChanged", chainChanged);
        provider.removeListener?.("disconnect", disconnected);
      };
    },
    [clearIdentity, revokeSession],
  );

  const loadAuthenticatedData = useCallback(
    async (activeAddress, epoch) => {
      const session = await requestJson("/session");
      const sessionAddress = payloadAddress(session);
      const provider = providerRef.current;
      const currentConfig = configRef.current;
      if (
        epochRef.current !== epoch ||
        !provider ||
        !currentConfig?.chain ||
        !sessionAddress ||
        sessionAddress.toLowerCase() !== activeAddress.toLowerCase()
      ) {
        if (epochRef.current === epoch) {
          setProfile(null);
          setAuthenticated(false);
          setLands([]);
        }
        return false;
      }
      const accounts = providerAccounts(
        await provider.request({ method: "eth_accounts" }),
      );
      const chainId = parseChainId(
        await provider.request({ method: "eth_chainId" }),
      );
      if (
        epochRef.current !== epoch ||
        chainId !== expectedChainId(currentConfig.chain) ||
        accounts[0]?.toLowerCase() !== activeAddress.toLowerCase()
      ) {
        if (epochRef.current === epoch) clearIdentity();
        return false;
      }
      setAddress(activeAddress);
      setProfile(session.profile ?? null);
      setAuthenticated(true);
      const landsResult = await requestJson("/lands");
      const finalAccounts = providerAccounts(
        await provider.request({ method: "eth_accounts" }),
      );
      const finalChainId = parseChainId(
        await provider.request({ method: "eth_chainId" }),
      );
      if (
        epochRef.current !== epoch ||
        finalChainId !== expectedChainId(currentConfig.chain) ||
        finalAccounts[0]?.toLowerCase() !== activeAddress.toLowerCase()
      ) {
        if (epochRef.current === epoch) clearIdentity();
        return false;
      }
      setLands(normalizeLands(landsResult?.lands));
      return true;
    },
    [clearIdentity],
  );

  const refresh = useCallback(async () => {
    const provider = providerRef.current;
    const currentConfig = configRef.current;
    if (!provider || !currentConfig?.chain) {
      clearIdentity();
      return false;
    }
    const epoch = epochRef.current;
    try {
      const accounts = providerAccounts(
        await provider.request({ method: "eth_accounts" }),
      );
      const activeAddress = accounts.find(validAddress);
      const chainId = parseChainId(
        await provider.request({ method: "eth_chainId" }),
      );
      if (epochRef.current !== epoch) return false;
      if (!activeAddress || chainId !== expectedChainId(currentConfig.chain)) {
        clearIdentity(
          activeAddress || null,
          chainId
            ? {
                ...currentConfig.chain,
                expectedChainId: expectedChainId(currentConfig.chain),
                connectedChainId: chainId,
              }
            : null,
        );
        revokeSession().catch(() => {});
        return false;
      }
      setAddress(activeAddress);
      setChain({
        ...currentConfig.chain,
        expectedChainId: expectedChainId(currentConfig.chain),
        connectedChainId: chainId,
      });
      return await loadAuthenticatedData(activeAddress, epoch);
    } catch {
      if (epochRef.current === epoch) clearIdentity();
      return false;
    }
  }, [clearIdentity, loadAuthenticatedData, revokeSession]);

  useEffect(() => {
    updateConfig(connector.server);
    setReady(true);
    if (connector.provider) {
      bindProvider(connector.provider);
      if (!busyRef.current) void refresh();
    }
  }, [
    connector.server,
    connector.provider,
    updateConfig,
    bindProvider,
    refresh,
  ]);

  useEffect(() => {
    return () => {
      providerCleanupRef.current?.();
      providerCleanupRef.current = null;
      providerRef.current = null;
      epochRef.current++;
    };
  }, []);

  const connect = useCallback(
    async (provider = null) => {
      if (busyRef.current) return false;
      if (!configRef.current?.chain) {
        setError(
          "Конфигурация сети не загрузилась. Обновите страницу и попробуйте снова.",
        );
        return false;
      }
      busyRef.current = true;
      setBusy(true);
      setError("");
      let selected;
      try {
        selected =
          provider || providerRef.current || (await connector.select());
      } catch (selectionError) {
        setError(walletError(selectionError));
        endBusy();
        return false;
      }
      if (!selected) {
        endBusy();
        return null;
      }
      if (providerRef.current && providerRef.current !== selected) {
        clearIdentity();
        revokeSession().catch(() => {});
      }
      bindProvider(selected);
      const attempt = { address: null, invalid: false };
      connectionAttempt.current = attempt;
      try {
        const expected = expectedChainId(configRef.current.chain);
        if (!expected)
          throw new Error("Сервер передал неверный идентификатор сети.");
        const accounts = providerAccounts(
          await selected.request({ method: "eth_accounts" }),
        );
        const activeAddress = accounts.find(validAddress);
        attempt.address = activeAddress;
        if (!activeAddress)
          throw new Error(
            "Кошелёк заблокирован или не предоставил адрес. Разблокируйте его и повторите подключение.",
          );
        const actual = await switchToConfiguredChain(
          selected,
          configRef.current.chain,
        );
        const confirmedAccounts = providerAccounts(
          await selected.request({ method: "eth_accounts" }),
        );
        const finalChain = parseChainId(
          await selected.request({ method: "eth_chainId" }),
        );
        if (
          attempt.invalid ||
          connectionAttempt.current !== attempt ||
          providerRef.current !== selected ||
          finalChain !== expected ||
          actual !== expected ||
          confirmedAccounts[0]?.toLowerCase() !== activeAddress.toLowerCase()
        )
          throw new Error(
            "Сеть или адрес кошелька изменились во время подключения. Проверьте их и повторите попытку.",
          );
        setAddress(activeAddress);
        setChain({
          ...configRef.current.chain,
          expectedChainId: expected,
          connectedChainId: actual,
        });
        await logoutRef.current;
        const restored = await loadAuthenticatedData(
          activeAddress,
          epochRef.current,
        );
        return { address: activeAddress, restored };
      } catch (connectError) {
        setError(walletError(connectError));
        return false;
      } finally {
        if (connectionAttempt.current === attempt)
          connectionAttempt.current = null;
        endBusy();
      }
    },
    [
      connector,
      bindProvider,
      clearIdentity,
      endBusy,
      revokeSession,
      loadAuthenticatedData,
    ],
  );

  const signIn = useCallback(
    async (requestedAddress = null) => {
      const provider = providerRef.current;
      const activeAddress =
        typeof requestedAddress === "string" ? requestedAddress : address;
      const currentConfig = configRef.current;
      if (!provider || !activeAddress || !currentConfig?.chain) {
        setError("Сначала подключите кошелёк к целевой сети.");
        return false;
      }
      if (busyRef.current) return false;
      busyRef.current = true;
      setBusy(true);
      setError("");
      const epoch = epochRef.current;
      const ensureCurrent = async () => {
        const accounts = providerAccounts(
          await provider.request({ method: "eth_accounts" }),
        );
        const chainId = parseChainId(
          await provider.request({ method: "eth_chainId" }),
        );
        return (
          epochRef.current === epoch &&
          chainId === expectedChainId(currentConfig.chain) &&
          accounts[0]?.toLowerCase() === activeAddress.toLowerCase()
        );
      };
      try {
        await logoutRef.current;
        if (!(await ensureCurrent()))
          throw new Error(
            "Кошелёк или сеть изменились. Подключите кошелёк заново.",
          );
        const challenge = await requestJson("/auth/challenge", {
          method: "POST",
          body: JSON.stringify({
            address: activeAddress,
            chainId: expectedChainId(currentConfig.chain),
          }),
        });
        if (typeof challenge?.message !== "string" || !challenge.message)
          throw new Error("Сервер не выдал сообщение для входа.");
        if (!(await ensureCurrent()))
          throw new Error(
            "Кошелёк или сеть изменились. Подключите кошелёк заново.",
          );
        const signature = await provider.request({
          method: "personal_sign",
          params: [stringToHex(challenge.message), activeAddress],
        });
        if (typeof signature !== "string" || !(await ensureCurrent()))
          throw new Error(
            "Подпись не получена или кошелёк изменился. Попробуйте снова.",
          );
        const verified = await requestJson("/auth/verify", {
          method: "POST",
          body: JSON.stringify({ message: challenge.message, signature }),
        });
        if (
          epochRef.current !== epoch ||
          payloadAddress(verified)?.toLowerCase() !==
            activeAddress.toLowerCase()
        ) {
          await requestJson("/auth/logout", { method: "POST" }).catch(() => {});
          throw new Error(
            "Сервер подтвердил другой адрес или кошелёк изменился. Вход отменён.",
          );
        }
        setAddress(activeAddress);
        setProfile(verified.profile ?? null);
        setAuthenticated(true);
        const result = await requestJson("/lands");
        if (epochRef.current !== epoch) {
          await requestJson("/auth/logout", { method: "POST" }).catch(() => {});
          return false;
        }
        setLands(normalizeLands(result?.lands));
        return true;
      } catch (signInError) {
        if (epochRef.current === epoch) setError(walletError(signInError));
        return false;
      } finally {
        endBusy();
      }
    },
    [address, endBusy],
  );

  const disconnect = useCallback(async () => {
    if (connectionAttempt.current) connectionAttempt.current.invalid = true;
    clearIdentity();
    providerCleanupRef.current?.();
    providerCleanupRef.current = null;
    providerRef.current = null;
    setError("");
    try {
      await Promise.all([revokeSession(), connector.disconnect()]);
    } catch (logoutError) {
      setError(
        `Кошелёк отключён на этой странице, но серверную сессию завершить не удалось: ${walletError(logoutError)}`,
      );
    }
  }, [clearIdentity, revokeSession, connector]);

  const saveProfile = useCallback(
    async (nextProfile) => {
      if (!address || !authenticated)
        throw new Error(
          "Войдите по подписи кошелька, чтобы сохранить профиль.",
        );
      const epoch = epochRef.current;
      const result = await requestJson("/profile", {
        method: "PUT",
        headers: { "X-Wallet-Address": address },
        body: JSON.stringify(nextProfile),
      });
      if (
        epochRef.current !== epoch ||
        payloadAddress(result)?.toLowerCase() !== address.toLowerCase()
      )
        throw new Error(
          "Кошелёк изменился во время сохранения профиля. Войдите снова.",
        );
      const saved = result?.profile ?? result;
      setProfile(saved);
      return saved;
    },
    [address, authenticated],
  );

  const checkAccess = useCallback(
    async (id) => {
      if (!address || !authenticated)
        return { allowed: false, reason: "authentication_required" };
      const epoch = epochRef.current;
      if (
        !(typeof id === "number" && Number.isSafeInteger(id) && id > 0) &&
        !(typeof id === "string" && /^\d+$/.test(id))
      )
        throw new TypeError("Укажи корректный номер участка.");
      try {
        const result = await requestJson(
          `/lands/${encodeURIComponent(id)}/access`,
          { headers: { "X-Wallet-Address": address } },
        );
        return normalizeAccessResult(result, epochRef.current === epoch);
      } catch (accessError) {
        return {
          allowed: false,
          reason: accessError?.message || "access_unverified",
        };
      }
    },
    [address, authenticated],
  );

  const clearError = useCallback(() => setError(""), []);
  return {
    address,
    profile,
    authenticated,
    chain,
    commerce: config?.commerce ?? null,
    lands,
    ready,
    busy,
    error,
    connect,
    signIn,
    disconnect,
    saveProfile,
    checkAccess,
    refresh,
    clearError,
  };
}

const panelStyles = `
.wallet-panel{display:grid;gap:14px;color:inherit;font:inherit}
.wallet-panel__row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.wallet-panel__meta{display:grid;gap:5px;min-width:0}
.wallet-panel__address{font:12px ui-monospace,monospace;overflow-wrap:anywhere;opacity:.78}
.wallet-panel__network{font-size:12px;opacity:.75}
.wallet-panel__actions{display:flex;flex-wrap:wrap;gap:8px}
.wallet-panel__button{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 14px;border:1px solid #4d6876;border-radius:1px;background:#192c39;color:#c4d9d5;font:inherit;font-size:12px}
.wallet-panel__button--primary{background:#f1c443;color:#1b281c;border-color:#edda8e;box-shadow:inset 0 2px #fff4,inset 0 -3px #0003}
.wallet-panel__button--wallet{justify-content:flex-start}
.wallet-panel__error{padding:10px 12px;border:1px solid #a56b62;border-radius:1px;color:#e3aca0;background:#3b2630;font-size:12px;line-height:1.7}
.wallet-panel__profile{font-weight:600}
`;

export function WalletPanel({ wallet, onProfile, onConnect }) {
  const signedIn = Boolean(wallet?.address && wallet?.authenticated);
  const connectedToTarget = Boolean(
    wallet?.chain &&
    wallet.chain.connectedChainId != null &&
    wallet.chain.connectedChainId === wallet.chain.expectedChainId,
  );
  const shownError = wallet?.error;
  const completeProfile = () => onProfile?.(wallet?.profile ?? null);
  return (
    <section className="wallet-panel" aria-label="Криптовалютный кошелёк">
      <style>{panelStyles}</style>
      <span className="modal-eyebrow">КОШЕЛЁК / ROBINHOOD CHAIN</span>
      <h2>
        {signedIn
          ? "Вход подтверждён"
          : wallet?.address
            ? "Подтвердите вход в кошельке"
            : "Войти в Rich Birds"}
      </h2>
      <p>
        Подключение открывает адрес кошелька. Отдельная подпись подтверждает
        вход без перевода средств. Seed-фразу и приватный ключ сайт не
        запрашивает.
      </p>
      {wallet?.address ? (
        <div className="wallet-panel__row">
          <div className="wallet-panel__meta">
            <strong>
              {signedIn
                ? wallet.profile?.nickname || "Профиль кошелька"
                : "Кошелёк подключён"}
            </strong>
            <span className="wallet-panel__address" title={wallet.address}>
              {formatAddress(wallet.address)}
            </span>
            <span className="wallet-panel__network">
              {networkStatus(wallet.chain)}
            </span>
          </div>
          <button
            className="wallet-panel__button"
            type="button"
            disabled={wallet.busy}
            onClick={wallet.disconnect}
          >
            Отключить
          </button>
        </div>
      ) : (
        <div className="wallet-panel__meta">
          <strong>Подключите Ethereum-кошелёк</strong>
          <span className="wallet-panel__network">
            {wallet?.chain
              ? networkStatus(wallet.chain)
              : "Целевая сеть: загрузка конфигурации…"}
          </span>
        </div>
      )}
      {!signedIn && wallet?.address && connectedToTarget && (
        <button
          className="wallet-panel__button wallet-panel__button--primary"
          type="button"
          disabled={wallet.busy}
          onClick={wallet.signIn}
        >
          {wallet.busy ? "Ожидаем подтверждение…" : "Войти по подписи"}
        </button>
      )}
      {!signedIn && wallet?.address && !connectedToTarget && (
        <button
          className="wallet-panel__button wallet-panel__button--primary"
          type="button"
          disabled={wallet.busy}
          onClick={onConnect}
        >
          {wallet.busy ? "Переключение сети…" : "Подключиться к целевой сети"}
        </button>
      )}
      {signedIn && (
        <>
          <div className="wallet-panel__profile">
            {wallet.profile?.nickname || "Вход подтверждён подписью кошелька"}
          </div>
          {onProfile && (
            <button
              className="wallet-panel__button"
              type="button"
              disabled={wallet.busy}
              onClick={completeProfile}
            >
              Настроить профиль
            </button>
          )}
        </>
      )}
      {!wallet?.address && (
        <div className="wallet-panel__actions">
          <button
            className="wallet-panel__button wallet-panel__button--primary"
            type="button"
            disabled={!wallet?.ready || wallet?.busy}
            onClick={onConnect}
          >
            {wallet?.busy ? "Подключение…" : "Подключить кошелёк"}
          </button>
        </div>
      )}
      {shownError && (
        <div className="wallet-panel__error" role="alert">
          {shownError}
        </div>
      )}
    </section>
  );
}
