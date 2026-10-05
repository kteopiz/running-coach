import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { requireNode, root } from "./runtime.mjs";

requireNode();
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill("SIGTERM");
}
for (const script of ["server/index.mjs", "node_modules/vite/bin/vite.js"]) {
  const child = spawn(process.execPath, [resolve(root, script)], { cwd: root, stdio: "inherit" });
  children.push(child);
  child.once("error", (error) => { console.error(error.message); stop(1); });
  child.once("exit", (code, signal) => { if (!stopping) stop(code ?? (signal ? 1 : 0)); });
}
process.once("SIGINT", () => stop());
process.once("SIGTERM", () => stop());
