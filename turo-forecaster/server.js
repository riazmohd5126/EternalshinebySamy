// Turo Car Forecaster — tiny local server
// Serves turo-forecaster.html and saves your cars to a plain JSON file.
//
//   node server.js            → open http://localhost:4310 in your browser
//   PORT=5000 node server.js  → use a different port
//
// Data file: ~/Documents/Turo-Forecaster/turo-data.json (override with DATA_DIR=...)

const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const HTML_FILE = path.join(__dirname, "turo-forecaster.html");
const DEFAULT_DATA = { cars: [], activeId: null };

function dataPaths(dataDir) {
  const dir = dataDir || process.env.DATA_DIR || path.join(os.homedir(), "Documents", "Turo-Forecaster");
  return { dir, file: path.join(dir, "turo-data.json") };
}

function ensureData(p) {
  try { fs.mkdirSync(p.dir, { recursive: true }); } catch (e) {}
  if (!fs.existsSync(p.file)) {
    try { fs.writeFileSync(p.file, JSON.stringify(DEFAULT_DATA, null, 2)); } catch (e) {}
  }
}

function send(res, code, body, type = "application/json") {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

function startServer({ port = 0, host = "127.0.0.1", dataDir } = {}, cb) {
  const p = dataPaths(dataDir);
  ensureData(p);
  const server = http.createServer((req, res) => {
    const url = req.url.split("?")[0];
    if (req.method === "GET" && (url === "/" || url === "/index.html")) {
      fs.readFile(HTML_FILE, (err, data) => {
        if (err) return send(res, 500, "turo-forecaster.html is missing", "text/plain");
        send(res, 200, data, "text/html; charset=utf-8");
      });
      return;
    }
    if (url === "/api/data" && req.method === "GET") {
      fs.readFile(p.file, "utf8", (err, data) => {
        if (err) return send(res, 200, JSON.stringify(DEFAULT_DATA));
        try { JSON.parse(data); send(res, 200, data); } catch { send(res, 200, JSON.stringify(DEFAULT_DATA)); }
      });
      return;
    }
    if (url === "/api/data" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => { body += c; if (body.length > 20e6) req.destroy(); });
      req.on("end", () => {
        let parsed;
        try { parsed = JSON.parse(body); } catch (e) { return send(res, 400, JSON.stringify({ ok: false })); }
        ensureData(p);
        const tmp = p.file + ".tmp";
        fs.writeFile(tmp, JSON.stringify(parsed, null, 2), (err) => {
          if (err) return send(res, 500, JSON.stringify({ ok: false }));
          fs.rename(tmp, p.file, (err2) => send(res, err2 ? 500 : 200, JSON.stringify({ ok: !err2 })));
        });
      });
      return;
    }
    send(res, 404, "Not found", "text/plain");
  });
  server.listen(port, host, () => cb && cb(server.address().port, p.file));
  return server;
}

module.exports = { startServer };

if (require.main === module) {
  const port = Number(process.env.PORT) || 4310;
  startServer({ port }, (actual, file) => {
    console.log("Turo Car Forecaster running at  http://localhost:" + actual);
    console.log("Saving data to                   " + file);
    console.log("Press Ctrl+C to stop.");
  });
}
