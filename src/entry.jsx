import React from "react";
import { createRoot } from "react-dom/client";
import App from "./design.jsx";
import { WalletKit } from "./wallet-kit.jsx";

createRoot(document.getElementById("root")).render(
  <WalletKit>
    <App />
  </WalletKit>,
);
