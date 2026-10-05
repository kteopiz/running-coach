import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password, encoded) {
  const [algorithm, salt, hex] = encoded.split(":");
  if (algorithm !== "scrypt" || !salt || !hex || typeof password !== "string") return false;
  const stored = Buffer.from(hex, "hex");
  const actual = scryptSync(password, salt, 64);
  return stored.length === actual.length && timingSafeEqual(stored, actual);
}
