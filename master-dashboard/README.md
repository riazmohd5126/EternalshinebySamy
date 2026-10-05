# Master Dashboard

One desktop app for all of Riaz's apps: a **Home** screen with this month's key
numbers from every app, and a sidebar to open each one.

| App | Status | Its own data file |
|---|---|---|
| EternalShine by Samy | ✅ included | `~/Documents/EternalShine-by-Samy/samy-data.json` |
| Monthly Expenses | ✅ included | `~/Documents/Monthly-Expenses/expenses-data.json` |
| Universal Pharmacy | slot ready | — |
| Turo | slot ready | — |

**Databases stay separate.** Each app reads and writes only its own file, in its
own folder. The Home screen only *reads* them to show the summary. These are the
same files the standalone apps used, so existing data appears automatically.
Each app still has its own Backup / Restore buttons.

## Run it
Needs Node.js (nodejs.org, LTS).

    cd master-dashboard
    npm install      # first time only, downloads Electron (~200 MB)
    npm start        # opens the app

## Build the Mac app (for the Dock)
    npm run dist

Then drag `dist/mac-arm64/Master Dashboard.app` (or `dist/mac/…` on Intel) to
Applications. First launch: right-click → Open → Open.

## Folder layout
    master-dashboard/
      main.js          window + local server; the list of apps and their data files
      home.html        sidebar + Home summary
      icon.png
      apps/
        eternalshine/index.html
        expenses/index.html

## Adding Universal Pharmacy or Turo
1. Put the app's page at `apps/<id>/index.html` (`pharmacy` or `turo`). It loads
   and saves its data with `fetch("api/data")` (GET to load, POST to save).
2. Add an entry to `MODULES` in `main.js` with the folder and file name for its
   own data.
3. In `home.html`, set `ready: true` for that app and add its summary numbers.
