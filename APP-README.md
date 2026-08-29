# Samy & Sparkle — Desktop App (build guide)

This turns the dashboard into a real macOS app: its own window and Dock icon,
no browser tab, no Terminal window. Data is saved to a plain file at
**~/Documents/Samy-Sparkle/samy-data.json** (easy to find and back up).

## Files you need (put all 4 in one new folder, e.g. ~/samy-app)
- package.json
- main.js
- samy-sparkle.html   ← the dashboard (download the latest one)
- icon.png            ← the app icon

## One-time setup
1. Make sure Node.js is installed (nodejs.org, LTS).
2. Open Terminal in the folder:  cd ~/samy-app
3. Install the tools (downloads Electron the first time, ~200 MB):

       npm install

## Try it instantly (no build)
    npm start

An app window opens with the dashboard and the ring icon in the Dock. Close the
window to quit. This is the quickest way to confirm everything works.

## Build the standalone .app (for the Dock permanently)
    npm run dist

When it finishes, look in the new **dist** folder:
- dist/mac-arm64/Samy & Sparkle.app   (Apple Silicon)  — or
- dist/mac/Samy & Sparkle.app          (Intel)

Drag **Samy & Sparkle.app** to your Applications folder. Double-click to run.
First launch only: if macOS says "unidentified developer," right-click the app →
Open → Open. After that it opens normally, and you can keep it in the Dock
(right-click its icon → Options → Keep in Dock).

## Bring your existing data over
Your current data lives in your old samy-data.json. To keep it:
- Easiest: launch the app, click **Restore** (top-right), and pick your old
  samy-data.json (or a Backup file). Done.
- Or copy your old samy-data.json into ~/Documents/Samy-Sparkle/ (replacing the
  empty one created on first run), then reopen the app.

## Notes
- The app still loads a few libraries (React, fonts, spreadsheet reader) from the
  internet on first open; after that they're cached.
- To back up: copy ~/Documents/Samy-Sparkle/samy-data.json somewhere safe, or use
  the in-app Backup button.
