import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  createConfig,
  http,
  WagmiProvider,
  useAccount,
  useDisconnect,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  darkTheme,
  useConnectModal,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

const ConnectorContext = createContext(null);
const queryClient = new QueryClient();

function WalletHelp() {
  return (
    <p className="wallet-kit-help">
      Выберите установленное расширение. Нет кошелька? Установите{" "}
      <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">
        MetaMask
      </a>{" "}
      или{" "}
      <a href="https://rabby.io/" target="_blank" rel="noreferrer">
        Rabby
      </a>{" "}
      и обновите страницу.
      <br />
      После подключения подтвердите вход подписью. Новый пользователь затем
      указывает ник и аватар. Средства не списываются.
    </p>
  );
}

export function WalletKit({ children }) {
  const [setup, setSetup] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    fetch("/api/config")
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Не удалось загрузить настройки сети.");
        const server = await response.json();
        const chain = {
          ...server.chain,
          rpcUrls: { default: { http: [server.chain.rpcUrl] } },
          blockExplorers: {
            default: { name: "Explorer", url: server.chain.explorerUrl },
          },
        };
        const config = createConfig({
          chains: [chain],
          connectors: [injected()],
          transports: { [chain.id]: http(chain.rpcUrls.default.http[0]) },
        });
        if (alive) setSetup({ config, server });
      })
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, []);
  if (!setup)
    return (
      <main className="connection-loading" role="status">
        <h1>Rich Birds</h1>
        <p>{error || "Загрузка мира…"}</p>
        {error && <button onClick={() => location.reload()}>Повторить</button>}
      </main>
    );
  return (
    <WagmiProvider config={setup.config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          locale="ru-RU"
          modalSize="compact"
          theme={darkTheme({
            accentColor: "#e9c658",
            accentColorForeground: "#162229",
            borderRadius: "small",
          })}
          appInfo={{ appName: "Rich Birds", disclaimer: WalletHelp }}
        >
          <ConnectorBridge server={setup.server}>{children}</ConnectorBridge>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function ConnectorBridge({ server, children }) {
  const { connector, isConnected, status } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const { openConnectModal, connectModalOpen } = useConnectModal();
  const pending = useRef(null);
  const modalWasOpen = useRef(false);
  const [provider, setProvider] = useState(null);
  useEffect(() => {
    let alive = true;
    if (
      status !== "connected" ||
      typeof connector?.getProvider !== "function"
    ) {
      setProvider(null);
      return;
    }
    connector
      .getProvider()
      .then((next) => {
        if (!alive) return;
        setProvider(next);
        pending.current?.(next);
        pending.current = null;
      })
      .catch(() => {
        pending.current?.(null);
        pending.current = null;
      });
    return () => {
      alive = false;
    };
  }, [connector, status]);
  useEffect(() => {
    if (connectModalOpen) modalWasOpen.current = true;
    else if (modalWasOpen.current) {
      modalWasOpen.current = false;
      if (!isConnected) {
        pending.current?.(null);
        pending.current = null;
      }
    }
  }, [connectModalOpen, isConnected]);
  const select = () => {
    if (provider) return Promise.resolve(provider);
    if (!openConnectModal) return Promise.resolve(null);
    return new Promise((resolve) => {
      pending.current?.(null);
      pending.current = resolve;
      openConnectModal();
    });
  };
  return (
    <ConnectorContext.Provider
      value={{ server, provider, select, disconnect: disconnectAsync }}
    >
      {children}
    </ConnectorContext.Provider>
  );
}

export const useWalletConnector = () => useContext(ConnectorContext);
