# Master Dashboard

One desktop app for all of Riaz's apps: a **Home** screen with this month's key
numbers from every app, and a sidebar to open each one.

| App | Its own database |
|---|---|
| EternalShine by Samy | `~/Documents/EternalShine-by-Samy/samy-data.json` |
| Monthly Expenses | `~/Documents/Monthly-Expenses/expenses-data.json` |
| Turo Car Forecaster | `~/Documents/Turo-Forecaster/turo-data.json` |
| Universal Healthcare Pharma | `~/Documents/Universal-Healthcare-Pharma/data.json` |

**Numbers start hidden.** Every time the app opens, the Home screen shows dots
instead of amounts. Click an app's card or summary tile (or its **Show** button)
to reveal just that app, or turn on **Show all** at the top. **Hide** or turning
Show all off hides them again. Nothing is remembered between launches.

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

## Universal Healthcare Pharma
The app from `riazmohd5126/pharma-dashboard` (monthly recovery, the medicine
owner's share, expenses, transfers and forecast). It uses the same data file as
its standalone app, `~/Documents/Universal-Healthcare-Pharma/data.json`, so your
existing months, expenses and transfers appear as they are. Home shows this
month's recovery, your share and net profit (or the latest month if this month
isn't logged yet), calculated the same way as the app.

## Folder layout
    master-dashboard/
      main.js          window + local server; the list of apps and their data files
      home.html        sidebar + Home summary
      icon.png
      apps/
        eternalshine/index.html
        expenses/index.html
        turo/index.html, model.js     (model.js = the forecast maths, shared with Home)
        pharmacy/index.html           (Universal Healthcare Pharma)

## Adding another app
1. Put its page at `apps/<id>/index.html`. It loads and saves its data with
   `fetch("api/data")` (GET to load, POST to save).
2. Add an entry to `MODULES` in `main.js` with the folder and file name for its
   own data.
3. Add it to `APPS` in `home.html` with its summary numbers.
