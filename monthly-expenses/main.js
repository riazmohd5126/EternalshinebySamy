// Monthly Expenses — Electron desktop app
// Opens the expense tracker in its own window. Data is stored in a plain JSON file
// at ~/Documents/Monthly-Expenses/expenses-data.json so you can see and back it up.

const { app, BrowserWindow, nativeImage } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(app.getPath("documents"), "Monthly-Expenses");
const DATA_FILE = path.join(DATA_DIR, "expenses-data.json");
const HTML_FILE = path.join(__dirname, "expenses.html");
const DEFAULT_DATA = { expenses: [], settings: { currency: "$", budgets: {} } };

let serverPort = 0;

function ensureData() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
  if (!fs.existsSync(DATA_FILE)) {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2)); } catch (e) {}
  }
}

function send(res, code, body, type = "application/json") {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

function startServer(cb) {
  const server = http.createServer((req, res) => {
    const url = req.url.split("?")[0];
    if (req.method === "GET" && (url === "/" || url === "/index.html")) {
      fs.readFile(HTML_FILE, (err, data) => {
        if (err) return send(res, 500, "expenses.html missing from the app", "text/plain");
        send(res, 200, data, "text/html; charset=utf-8");
      });
      return;
    }
    if (url === "/api/data" && req.method === "GET") {
      fs.readFile(DATA_FILE, "utf8", (err, data) => {
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
        const tmp = DATA_FILE + ".tmp";
        fs.writeFile(tmp, JSON.stringify(parsed, null, 2), (err) => {
          if (err) return send(res, 500, JSON.stringify({ ok: false }));
          fs.rename(tmp, DATA_FILE, (err2) => send(res, err2 ? 500 : 200, JSON.stringify({ ok: !err2 })));
        });
      });
      return;
    }
    send(res, 404, "Not found", "text/plain");
  });
  server.listen(0, "127.0.0.1", () => cb(server.address().port));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1180, height: 820, minWidth: 900, minHeight: 640,
    title: "Monthly Expenses", backgroundColor: "#F6F7F4",
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
