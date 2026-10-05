import { requireNode, runNpm } from "./runtime.mjs";

requireNode();
try {
  await runNpm(["ci", "--no-audit", "--no-fund"]);
  await runNpm(["run", "db:setup"]);
  await runNpm(["run", "dev"]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
