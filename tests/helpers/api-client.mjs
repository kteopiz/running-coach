import { Readable } from "node:stream";
import { createApi } from "../../server/api.mjs";

// Dispatch through the real HTTP request listener without opening a network port.
// This exercises routing, sessions, validation and SQLite in restricted runners.
export function apiClient(db) {
  const server = createApi(db);
  let cookie = "";
  return async (path, method = "GET", body) => {
    const req = Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
    Object.assign(req, {
      method, url: `/api${path}`,
      headers: { ...(cookie ? { cookie } : {}), ...(body === undefined ? {} : { "content-type": "application/json" }) },
    });
    return new Promise((resolve) => {
      const headers = {};
      let status;
      const res = {
        setHeader(name, value) { headers[name.toLowerCase()] = value; },
        writeHead(code, values) { status = code; Object.assign(headers, values); },
        end(text) {
          if (headers["set-cookie"]) cookie = headers["set-cookie"].split(";")[0];
          resolve({ status, ...JSON.parse(text) });
        },
      };
      server.emit("request", req, res);
    });
  };
}
