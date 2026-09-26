# Wallet integration

The UI uses RainbowKit 2.2.11, wagmi 2.19.5 and viem 2.56.9. The single supported transport is an injected EIP-1193 wallet, discovered with EIP-6963. No WalletConnect project ID, QR connector, wallet SDK analytics, or payment transaction is configured.

Reference: [RainbowKit installation](https://rainbowkit.com/en-US/docs/installation), [RainbowKit v2 and EIP-6963](https://rainbowkit.com/guides/rainbowkit-wagmi-v2).

## Flow

1. The header opens RainbowKit directly. Only installed extensions appear; installation links are available when none are installed. Cancelling does not open a second picker.
2. The selected provider is passed to the existing server-configured chain check. Merely finding an extension does not guarantee it supports Robinhood Chain or custom networks.
3. A browser-bound SIWE challenge is signed and verified by the server. The wallet can reject the signature without registering a user or transferring funds.
4. A verified address without a profile must choose a nickname and avatar. Escape/backdrop cannot bypass registration; cancellation disconnects. Land access also requires a saved profile on the server.
5. Existing profiles are loaded from SQLite. A still-valid session can be restored only after the provider account and chain match. Account/network changes clear the UI identity and revoke the server session.

Profile data is not read from wallet localStorage. See [the Russian local-run guide](local-run.ru.md) for database location, contents and backup boundaries.

## Dependency audit

The `ws@8` override keeps wagmi's nested SDK dependencies on the patched 8.21.0 version. At this revision, `npm audit --omit=dev` reports no high/critical findings but 22 moderate package findings, rooted in `uuid` and `decode-uri-component` inside bundled third-party SDK dependency trees. The affected SDK/WalletConnect connectors are not configured by this app. This is not a clean dependency audit or a production security certification. Reassess these findings before enabling those connectors; do not force-upgrade wagmi to an incompatible major merely to silence the report.

The browser fixture uses a freshly generated, disposable signer and refuses transaction methods. It is test code, never loaded by the app entry point and not a replacement for testing a real extension on the deployed origin.

## Browser regression check

With the managed Preview or local app already running, and `agent-browser` installed:

```sh
npm run test:wallet-browser
```

The default address is `http://localhost:3000/`, matching the server's allowed local origin. Override `WALLET_BROWSER_URL` only with an exact origin configured by the server. The test uses an isolated browser session and creates disposable test profiles in the running server's database; use a test database, not production. It does not start a second application server.
