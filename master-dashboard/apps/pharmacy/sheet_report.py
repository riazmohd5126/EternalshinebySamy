# Reads the MR pipeline's Google Sheet (read-only) and prints it as JSON for the Master Dashboard.
# Run by the dashboard with the pipeline folder as the working directory, so it uses the
# pipeline's own config.py (sheet ID, tab names, service-account credentials).
import json
import os
import sys

sys.path.insert(0, os.getcwd())

try:
    from config import (GOOGLE_SHEET_ID, SERVICE_ACCOUNT_JSON,
                        SHEET_DAILY_REPORTS, SHEET_ORDERS, SHEET_EXCEPTIONS)
    import gspread
    from google.oauth2.service_account import Credentials

    creds = Credentials.from_service_account_file(
        SERVICE_ACCOUNT_JSON,
        scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"])
    sheet = gspread.authorize(creds).open_by_key(GOOGLE_SHEET_ID)

    def rows(tab):
        try:
            return sheet.worksheet(tab).get_all_records()
        except gspread.WorksheetNotFound:
            return []

    print(json.dumps({
        "sheetId": GOOGLE_SHEET_ID,
        "daily": rows(SHEET_DAILY_REPORTS),
        "orders": rows(SHEET_ORDERS),
        "exceptions": rows(SHEET_EXCEPTIONS),
    }, default=str))
except Exception as e:
    print(json.dumps({"error": f"{type(e).__name__}: {e}"}))
    sys.exit(1)
