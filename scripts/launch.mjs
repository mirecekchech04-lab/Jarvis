#!/usr/bin/env node
/* J.A.R.V.I.S. desktop launcher.
 * Starts the server, waits until it's ready, then opens the browser.
 * Used by the desktop shortcut and by `npm run launch`.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import http from "node:http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = process.env.PORT || 3000;
const URL = `http://localhost:${PORT}`;

function ensureDeps() {
  if (existsSync(path.join(ROOT, "node_modules", "express"))) return Promise.resolve();
  console.log("Installing dependencies (first run)…");
  return new Promise((resolve, reject) => {
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const p = spawn(npm, ["install"], { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`npm install exited ${code}`))));
    p.on("error", reject);
  });
}

function waitForServer(retries = 40) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const req = http.get(`${URL}/healthz`, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (n <= 0) return reject(new Error("Server did not become ready in time."));
        setTimeout(() => attempt(n - 1), 300);
      });
    };
    attempt(retries);
  });
}

function openBrowser(url) {
  const platform = process.platform;
  let cmd, args;
  if (platform === "darwin") {
    cmd = "open";
    args = [url];
  } else if (platform === "win32") {
    cmd = "cmd";
    args = ["/c", "start", "", url];
  } else {
    cmd = "xdg-open";
    args = [url];
  }
  try {
    spawn(cmd, args, { stdio: "ignore", detached: true, shell: platform === "win32" }).unref();
  } catch (e) {
    console.log(`Open your browser at: ${url}`);
  }
}

async function main() {
  await ensureDeps();

  console.log("\n  Booting J.A.R.V.I.S. …\n");
  const server = spawn(process.execPath, [path.join(ROOT, "server.js")], {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, PORT: String(PORT) },
  });

  server.on("error", (err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });
  server.on("close", (code) => process.exit(code ?? 0));

  const shutdown = () => {
    if (!server.killed) server.kill("SIGINT");
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await waitForServer();
    console.log(`  Opening ${URL} …\n`);
    openBrowser(URL);
  } catch (e) {
    console.log(`  Server is starting. Open your browser at ${URL}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
