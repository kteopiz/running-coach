import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));

export function requireNode() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 13)) {
    console.error("Use Node.js 22.13+ (nvm use), then run npm run setup again.");
    process.exit(1);
  }
}

export function runNpm(args) {
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => child.kill(signal));
  }
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`npm ${args.join(" ")} stopped (${signal || code}).`)));
  });
}
