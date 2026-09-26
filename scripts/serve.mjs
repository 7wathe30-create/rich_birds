import { createServer as createHttpServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { createApiHandler } from "../server/api.js";
import { createDatabase } from "../server/database.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const production = process.env.NODE_ENV === "production";
const dist = resolve(root, "dist");
if (production && !existsSync(resolve(dist, "index.html"))) {
  throw new Error("Production build not found. Run npm run build first.");
}
if (
  Number(process.versions.node.split(".")[0]) < 22 ||
  (Number(process.versions.node.split(".")[0]) === 22 &&
    Number(process.versions.node.split(".")[1]) < 13)
) {
  throw new Error("Rich Birds server requires Node.js >=22.13 (node:sqlite).");
}

const database = createDatabase(
  process.env.DATABASE_PATH || "data/rich-birds.sqlite",
);
const api = createApiHandler({ database });
let vite = null;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function serveProduction(req, res) {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  const file = resolve(dist, relative || "index.html");
  if (file !== dist && !file.startsWith(`${dist}${sep}`)) {
    res.writeHead(400).end("Bad path");
    return;
  }
  const target =
    existsSync(file) && statSync(file).isFile()
      ? file
      : resolve(dist, "index.html");
  res.writeHead(200, {
    "content-type": mimeTypes[extname(target)] || "application/octet-stream",
    "x-content-type-options": "nosniff",
  });
  createReadStream(target).pipe(res);
}

const server = createHttpServer(async (req, res) => {
  try {
    if (await api(req, res)) return;
    if (vite)
      vite.middlewares(req, res, () => res.writeHead(404).end("Not found"));
    else serveProduction(req, res);
  } catch (error) {
    console.error("Request failed:", error.message);
    if (!res.headersSent)
      res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
    if (!res.writableEnded)
      res.end(JSON.stringify({ error: "internal_error" }));
  }
});

if (!production)
  vite = await createViteServer({
    root,
    configFile: resolve(root, "vite.config.js"),
    server: { middlewareMode: true, ws: { server } },
    appType: "spa",
  });

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
server.listen(port, host, () =>
  console.log(
    `Rich Birds listening on http://${host}:${port}${production ? " (production)" : " (development)"}`,
  ),
);

let shutdownPromise;
function shutdown() {
  if (shutdownPromise) return shutdownPromise;
  shutdownPromise = (async () => {
    await vite?.close();
    if (server.listening) {
      await new Promise((resolve) => {
        server.close(resolve);
        server.closeIdleConnections?.();
      });
    }
    database.close();
  })();
  return shutdownPromise;
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Stop the other process or set PORT to an available port.`,
    );
  } else {
    console.error(`HTTP server failed: ${error.message}`);
  }
  process.exitCode = 1;
  void shutdown().catch((shutdownError) => {
    console.error(`Shutdown failed: ${shutdownError.message}`);
    process.exitCode = 1;
  });
});

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
