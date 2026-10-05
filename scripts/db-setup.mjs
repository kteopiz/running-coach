import { createInterface } from "node:readline/promises";
import { requireNode } from "./runtime.mjs";

requireNode();
const reset = process.argv.includes("--reset");
if (reset) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await prompt.question("Delete all local accounts, runs, and sessions and restore sample data? Type RESET: ");
  prompt.close();
  if (answer !== "RESET") {
    console.log("Reset cancelled.");
    process.exit(0);
  }
}
const { databasePath, openDatabase, initializeDatabase } = await import("../server/database.mjs");
const db = openDatabase();
try {
  const seeded = initializeDatabase(db, { reset });
  console.log(`Database ready: ${databasePath}`);
  console.log(seeded ? "Sample accounts: alex@example.com and sam@example.com / password: demo123" : "Existing data preserved.");
} finally {
  db.close();
}
