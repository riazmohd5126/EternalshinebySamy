// Master Dashboard — one Electron app that hosts all of Riaz's apps.
// Each app keeps its OWN database: a separate JSON file in its own folder under ~/Documents.
// The window shows home.html (sidebar + summary); each app page runs inside it at /apps/<id>/
// and reads/writes only its own file through /apps/<id>/api/data.

const { app, BrowserWindow, nativeImage } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");

const DOCS = app.getPath("documents");

// To add an app: put its page at apps/<id>/index.html and add an entry here
// (and the matching tile in home.html). Its data file is created on first run.
const MODULES = [
  {
    id: "eternalshine",
    name: "EternalShine by Samy",
    dir: "EternalShine-by-Samy",
    file: "samy-data.json",
    defaults: { purchases: [], events: [] },
    // Older builds saved here; copied over once if the new file doesn't exist yet.
    legacy: [path.join(DOCS, "Samy-Sparkle", "samy-data.json")]
  },
  {
    id: "expenses",
    name: "Monthly Expenses",
    dir: "Monthly-Expenses",
    file: "expenses-data.json",
    defaults: { expenses: [] },
    legacy: []
  }
];
const byId = Object.fromEntries(MODULES.map(m => [m.id, m]));
const dataFile = m => path.join(DOCS, m.dir, m.file);

function ensureData() {
  for (const m of MODULES) {
    const f = dataFile(m);
    try { fs.mkdirSync(path.dirname(f), { recursive: true }); } catch (e) {}
    if (fs.existsSync(f)) continue;
    const old = m.legacy.find(p => fs.existsSync(p));
    try {
      if (old) fs.copyFileSync(old, f);
      else fs.writeFileSync(f, JSON.stringify(m.defaults, null, 2));
    } catch (e) {}
  }
}

const TYPES = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

function send(res, code, body, type = "application/json") {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

function serveFile(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, "Not found", "text/plain");
    send(res, 200, data, TYPES[path.extname(file)] || "application/octet-stream");
  });
}

function readData(m, res) {
  fs.readFile(dataFile(m), "utf8", (err, data) => {
    if (err) return send(res, 200, JSON.stringify(m.defaults));
    try { JSON.parse(data); send(res, 200, data); } catch { send(res, 200, JSON.stringify(m.defaults)); }
  });
}

function writeData(m, req, res) {
  let body = "";
  req.on("data", (c) => { body += c; if (body.length > 20e6) req.destroy(); });
  req.on("end", () => {
    let parsed;
    try { parsed = JSON.parse(body); } catch (e) { return send(res, 400, JSON.stringify({ ok: false })); }
    const f = dataFile(m), tmp = f + ".tmp";
    fs.writeFile(tmp, JSON.stringify(parsed, null, 2), (err) => {
      if (err) return send(res, 500, JSON.stringify({ ok: false }));
      fs.rename(tmp, f, (err2) => send(res, err2 ? 500 : 200, JSON.stringify({ ok: !err2 })));
    });
  });
}

function startServer(cb) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    if (req.method === "GET" && (url === "/" || url === "/index.html")) return serveFile(res, path.join(__dirname, "home.html"));
    if (req.method === "GET" && url === "/icon.png") return serveFile(res, path.join(__dirname, "icon.png"));
    if (req.method === "GET" && url === "/api/modules") {
      return send(res, 200, JSON.stringify(MODULES.map(m => ({ id: m.id, name: m.name, dataFile: dataFile(m) }))));
    }
    const mm = url.match(/^\/apps\/([a-z0-9-]+)(\/.*)?$/);
    if (mm && byId[mm[1]]) {
      const m = byId[mm[1]], rest = mm[2] || "";
      if (rest === "") { res.writeHead(302, { Location: "/apps/" + m.id + "/" }); return res.end(); }
      if (rest === "/api/data" && req.method === "GET") return readData(m, res);
      if (rest === "/api/data" && req.method === "POST") return writeData(m, req, res);
      if (req.method === "GET") {
        const rel = rest === "/" ? "index.html" : rest.slice(1);
        const base = path.join(__dirname, "apps", m.id);
        const file = path.join(base, rel);
        if (!file.startsWith(base + path.sep)) return send(res, 403, "Forbidden", "text/plain");
        return serveFile(res, file);
      }
    }
    send(res, 404, "Not found", "text/plain");
  });
  server.listen(0, "127.0.0.1", () => cb(server.address().port));
}

let serverPort = 0;
function createWindow() {
  const win = new BrowserWindow({
    width: 1320, height: 880, minWidth: 960, minHeight: 640,
    title: "Master Dashboard", backgroundColor: "#F4F5F2",
    webPreferences: { contextIsolation: true },
  });
  win.loadURL("http://127.0.0.1:" + serverPort);
}

app.whenReady().then(() => {
  ensureData();
  try {
    const img = nativeImage.createFromPath(path.join(__dirname, "icon.png"));
    if (process.platform === "darwin" && app.dock && !img.isEmpty()) app.dock.setIcon(img);
  } catch (e) {}
  startServer((port) => { serverPort = port; createWindow(); });
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
