# Monthly Expenses — Desktop App (build guide)

A household spending tracker built the same way as the EternalShine dashboard:
its own window and Dock icon, no browser tab, no Terminal window. Data is saved
to a plain file at **~/Documents/Monthly-Expenses/expenses-data.json** (easy to
find and back up).

## What it tracks
**Fixed bills** (copied forward each month): Rent · Gas · Electricity ·
Internet / WiFi · Phone bill · Fuel
**Other spending** (added by hand): Groceries · Subscriptions (Netflix, Prime…) · Other
**Transfers to India**: kept separate, never counted as household spending.

- **Copy fixed bills** — at the start of a month a banner offers *Copy N fixed
  bills from <last month>*. One click copies rent, gas, electricity, WiFi, phone
  and fuel with the same amounts; edit any that changed (gas, electricity…).
  Everything else you add by hand.
- **Month switcher** — step back and forth through months; everything follows.
- **Overview** — spent this month (fixed vs other), sent to India (month and
  year so far), total out (expenditure + transfers), and change vs last month; a
  per-category breakdown; a **Month by month** table with columns for fixed
  bills, other expenditure, total expenditure, **Transfers to India** and total out;
  a 12-month stacked chart (click a month to open it).
- **Expenditure** — record what you've spent: quick-add form (type "Netflix", "petrol" or "sent to Mum" and
  the category is picked for you), editable list, filters for fixed bills /
  other spending / transfers to India, export the month to CSV.
- **Upload** a CSV/Excel sheet (use **Template** for the columns:
  Date, Category, Description, Amount).

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
