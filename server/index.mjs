import { openDatabase, initializeDatabase } from "./database.mjs";
import { createApi } from "./api.mjs";

const db = openDatabase();
initializeDatabase(db);
const server = createApi(db);
server.on("error", (error) => {
  console.error(`Local API failed to start: ${error.message}`);
  db.close();
  process.exitCode = 1;
});
server.listen(3001, "127.0.0.1", () => console.log("Local API: http://127.0.0.1:3001"));
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    if (stopping) return;
    stopping = true;
    server.close(() => db.close());
    server.closeIdleConnections();
  });
}
