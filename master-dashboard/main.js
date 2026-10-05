// Master Dashboard — one Electron app that hosts all of Riaz's apps.
// Each app keeps its OWN database: a separate JSON file in its own folder under ~/Documents.
// The window shows home.html (sidebar + summary); each app page runs inside it at /apps/<id>/
// and reads/writes only its own file through /apps/<id>/api/data.

const { app, BrowserWindow, nativeImage, shell } = require("electron");
const http = require("http");
const { spawn } = require("child_process");
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
  },
  {
    id: "turo",
    name: "Turo Car Forecaster",
    dir: "Turo-Forecaster",
    file: "turo-data.json",
    defaults: { cars: [], activeId: null },
    legacy: []
  },
  {
    // The pharmacy's real database is its Google Sheet. This file holds only the
    // dashboard's settings for the pipeline and the last snapshot read from the sheet.
    id: "pharmacy",
    name: "Universal Pharmacy",
    dir: "Universal-Pharmacy",
    file: "pharmacy-data.json",
    defaults: { settings: { folder: "", python: "python3", geminiKey: "" }, snapshot: null },
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

/* ---------- Universal Pharmacy: runs the Python MR pipeline that lives in its own folder ---------- */
function pharmacySettings() {
  try { return JSON.parse(fs.readFileSync(dataFile(byId.pharmacy), "utf8")).settings || {}; } catch (e) { return {}; }
}
function pythonEnv(s) {
  // Apps opened from Finder get a bare PATH, so add the usual Homebrew / python.org locations.
  const env = { ...process.env, PYTHONUNBUFFERED: "1" };
  env.PATH = ["/opt/homebrew/bin", "/usr/local/bin", "/Library/Frameworks/Python.framework/Versions/Current/bin", env.PATH || ""].join(":");
  if (s.geminiKey) env.GEMINI_API_KEY = s.geminiKey;
  return env;
}
function pharmacyCheck() {
  const s = pharmacySettings(), folder = s.folder || "";
  const has = f => !!folder && fs.existsSync(path.join(folder, f));
  let batches = [], log = "";
  try {
    const st = JSON.parse(fs.readFileSync(path.join(folder, "pipeline_state.json"), "utf8"));
    batches = Object.entries(st).map(([key, v]) => ({ key, ...v }));
  } catch (e) {}
  try { log = fs.readFileSync(path.join(folder, "pipeline.log"), "utf8").split("\n").slice(-60).join("\n"); } catch (e) {}
  return { folder, folderFound: !!folder && fs.existsSync(folder), hasMain: has("main.py"), hasConfig: has("config.py"), batches, log };
}
const job = { running: false, mode: "", output: "", exitCode: null, startedAt: null };
function runPipeline(mode) {
  if (job.running) return false;
  const s = pharmacySettings();
  const args = ["main.py"].concat(mode === "test" ? ["--test"] : []);
  Object.assign(job, { running: true, mode, output: "$ " + (s.python || "python3") + " " + args.join(" ") + "\n", exitCode: null, startedAt: new Date().toISOString() });
  let child;
  try { child = spawn(s.python || "python3", args, { cwd: s.folder, env: pythonEnv(s) }); }
  catch (e) { job.output += String(e) + "\n"; job.running = false; job.exitCode = -1; return true; }
  const add = d => { job.output = (job.output + d).slice(-200000); };
  child.stdout.on("data", add);
  child.stderr.on("data", add);
  child.on("error", e => { add("\nCould not start Python: " + e.message + "\n"); });
  child.on("close", code => { job.running = false; job.exitCode = code; });
  return true;
}
function readSheet(cb) {
  const s = pharmacySettings();
  let code;
  try { code = fs.readFileSync(path.join(__dirname, "apps", "pharmacy", "sheet_report.py"), "utf8"); }
  catch (e) { return cb({ error: "sheet_report.py is missing from the app" }); }
  let out = "", err = "", child;
  // Passed with -c so it also works when the app is packaged (files inside app.asar can't be run directly).
  try { child = spawn(s.python || "python3", ["-c", code], { cwd: s.folder, env: pythonEnv(s) }); }
  catch (e) { return cb({ error: String(e) }); }
  child.stdout.on("data", d => out += d);
  child.stderr.on("data", d => err += d);
  child.on("error", e => cb({ error: "Could not start Python: " + e.message }));
  child.on("close", () => {
    try {
      const r = JSON.parse(out.trim().split("\n").pop());
      if (r.error) return cb(r);
      // Keep the snapshot in the pharmacy's own data file so the home screen can show it.
      const f = dataFile(byId.pharmacy);
      let d = {};
      try { d = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) {}
      d.snapshot = { fetchedAt: new Date().toISOString(), ...r };
      fs.writeFileSync(f, JSON.stringify(d, null, 2));
      cb({ ok: true, snapshot: d.snapshot });
    } catch (e) { cb({ error: (err || out || "No output from Python").trim().slice(-1500) }); }
  });
}
function readBody(req, cb) {
  let body = "";
  req.on("data", c => { body += c; if (body.length > 1e6) req.destroy(); });
  req.on("end", () => { try { cb(JSON.parse(body || "{}")); } catch (e) { cb({}); } });
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
      if (m.id === "pharmacy" && rest.startsWith("/api/") && rest !== "/api/data") {
        if (rest === "/api/status" && req.method === "GET") return send(res, 200, JSON.stringify(pharmacyCheck()));
        if (rest === "/api/run" && req.method === "GET") return send(res, 200, JSON.stringify(job));
        if (rest === "/api/run" && req.method === "POST") {
          return readBody(req, b => {
            const c = pharmacyCheck();
            if (!c.hasMain) return send(res, 400, JSON.stringify({ ok: false, error: "main.py not found in the pipeline folder" }));
            send(res, 200, JSON.stringify({ ok: runPipeline(b.mode === "test" ? "test" : "once"), job }));
          });
        }
        if (rest === "/api/sheet" && req.method === "POST") return readSheet(r => send(res, r.error ? 500 : 200, JSON.stringify(r)));
        return send(res, 404, "Not found", "text/plain");
      }
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
  // Links such as the Google Sheet open in the normal browser.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
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
