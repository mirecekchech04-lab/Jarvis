#!/usr/bin/env node
/* Cross-platform dispatcher: creates a desktop shortcut for the current OS.
 * Run with:  npm run install-shortcut
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const platform = process.platform;

let cmd, args;
if (platform === "win32") {
  cmd = "powershell";
  args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(__dirname, "install-shortcut.ps1")];
} else {
  cmd = "bash";
  args = [path.join(__dirname, "install-shortcut.sh")];
}

const child = spawn(cmd, args, { stdio: "inherit", shell: platform === "win32" });
child.on("close", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
  console.error("Failed to create shortcut:", err.message);
  process.exit(1);
});
