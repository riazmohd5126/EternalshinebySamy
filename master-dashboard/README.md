# Master Dashboard

One desktop app for all of Riaz's apps: a **Home** screen with this month's key
numbers from every app, and a sidebar to open each one.

| App | Its own database |
|---|---|
| EternalShine by Samy | `~/Documents/EternalShine-by-Samy/samy-data.json` |
| Monthly Expenses | `~/Documents/Monthly-Expenses/expenses-data.json` |
| Turo Car Forecaster | `~/Documents/Turo-Forecaster/turo-data.json` |
| Universal Pharmacy | `~/Documents/Universal-Pharmacy/pharmacy-data.json` |

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

## Universal Pharmacy (MR pipeline)
Everything is stored in its own JSON file: daily reports, order lines and the
needs-review queue. Google Sheets is not used.
- **Add a daily report** by hand (date, MR, area, TC, PC, POB, stockist).
- **Process new photos** runs the MR pipeline (the `Indian_Pharma` folder:
  main.py, config.py). The dashboard runs it through `apps/pharmacy/run_pipeline.py`,
  which swaps the pipeline's Google Sheets writer for one that saves to the JSON
  file. The pipeline folder itself is not changed. **Test run** = `main.py --test`.
- **Pipeline settings** (bottom of the page): the folder, the Python command that
  has its packages installed (e.g. `/opt/homebrew/bin/python3`), where photos come
  from (Google Drive or the local inbox folder) and optionally the Gemini API key
  (apps opened from Finder don't see your shell's environment variables).
- Deleting rows, marking review items done, Backup and Restore all work on the
  same JSON file.

## Folder layout
    master-dashboard/
      main.js          window + local server; the list of apps and their data files
      home.html        sidebar + Home summary
      icon.png
      apps/
        eternalshine/index.html
        expenses/index.html
        turo/index.html, model.js     (model.js = the forecast maths, shared with Home)
        pharmacy/index.html, run_pipeline.py

## Adding another app
1. Put its page at `apps/<id>/index.html`. It loads and saves its data with
   `fetch("api/data")` (GET to load, POST to save).
2. Add an entry to `MODULES` in `main.js` with the folder and file name for its
   own data.
3. Add it to `APPS` in `home.html` with its summary numbers.
