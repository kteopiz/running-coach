import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));

export function requireNode() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 13)) {
    console.error("Use Node.js 22.13+ (nvm use), then run npm run setup again.");
    process.exit(1);
  }
}
