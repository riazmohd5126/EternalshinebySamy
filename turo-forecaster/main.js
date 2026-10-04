// Turo Car Forecaster — Electron desktop app
// Opens the forecaster in its own window. Data is stored in a plain JSON file
// at ~/Documents/Turo-Forecaster/turo-data.json so you can see and back it up.

const { app, BrowserWindow } = require("electron");
const path = require("path");
const { startServer } = require("./server");

let serverPort = 0;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 900, minHeight: 640,
    title: "Turo Car Forecaster", backgroundColor: "#F6F7F5",
    webPreferences: { contextIsolation: true },
  });
  win.loadURL("http://127.0.0.1:" + serverPort);
}

app.whenReady().then(() => {
  startServer({ port: 0, dataDir: path.join(app.getPath("documents"), "Turo-Forecaster") }, (port) => {
    serverPort = port;
    createWindow();
  });
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
