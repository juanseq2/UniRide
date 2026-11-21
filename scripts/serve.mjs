import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const port = Number(process.env.PORT || 4173);
const distDirectory = resolve("frontend/dist");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer((request, response) => {
  const pathname = decodeURIComponent((request.url || "/").split("?")[0]);
  const requestedPath = resolve(distDirectory, `.${pathname}`);

  if (
    requestedPath !== distDirectory &&
    !requestedPath.startsWith(`${distDirectory}${sep}`)
  ) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  let filePath = requestedPath;
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = resolve(distDirectory, "index.html");
  }

  response.writeHead(200, {
    "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
}).listen(port, "0.0.0.0", () => {
  console.log(`UniRide frontend listening on port ${port}`);
});
