# Monthly Expenses — Desktop App (build guide)

A household spending tracker built the same way as the EternalShine dashboard:
its own window and Dock icon, no browser tab, no Terminal window. Data is saved
to a plain file at **~/Documents/Monthly-Expenses/expenses-data.json** (easy to
find and back up).

## What it tracks
Categories: **Rent · Gas · Electricity · Groceries · Internet / WiFi ·
Subscriptions (Netflix, Prime…) · Fuel · Other**

- **Month switcher** — step back and forth through months; everything follows.
- **Overview** — spent this month, budget left, change vs last month, day-to-day
  spend per day and where the month is heading; a per-category breakdown with
  budget bars; a 12-month stacked chart (click a bar to jump to that month).
- **Expenses** — quick-add form (type "Netflix" or "petrol" and the category is
  picked for you), editable list, filter by category, export the month to CSV.
- **Monthly bills** — tick *Monthly* on rent, WiFi, Netflix etc. Next month a
  button appears: *Add N recurring bills from <last month>* — one click and
  they're in.
- **Budgets** — a monthly limit per category (or fill from your 3-month
  averages), and a currency symbol ($, £, €, ₹, AED…).
- **Upload** a CSV/Excel sheet (use **Template** for the columns:
  Date, Category, Description, Amount, Recurring). Unknown categories are guessed
  from the description.

## Files you need (put all 4 in one folder, e.g. ~/expenses-app)
- package.json
- main.js
- expenses.html   ← the app
- icon.png        ← the app icon

## One-time setup
1. Make sure Node.js is installed (nodejs.org, LTS).
2. Open Terminal in the folder:  cd ~/expenses-app
3. Install the tools (downloads Electron the first time, ~200 MB):

       npm install

## Try it instantly (no build)
    npm start

## Build the standalone .app (for the Dock permanently)
    npm run dist

When it finishes, look in the new **dist** folder:
- dist/mac-arm64/Monthly Expenses.app   (Apple Silicon)  — or
- dist/mac/Monthly Expenses.app          (Intel)

Drag **Monthly Expenses.app** to Applications. First launch only: if macOS says
"unidentified developer," right-click the app → Open → Open.

## Without installing anything
You can also just double-click **expenses.html** to open it in a browser. Data
then lives in that browser only — use **Backup** now and then to keep a copy.

## Notes
- The app loads a few libraries (React, fonts, spreadsheet reader) from the
  internet on first open; after that they're cached.
- To back up: copy ~/Documents/Monthly-Expenses/expenses-data.json somewhere
  safe, or use the in-app **Backup** button. **Restore** loads a backup back in.
