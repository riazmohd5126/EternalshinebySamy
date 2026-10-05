# Runs the MR pipeline's main.py, but saves its results to the Universal Pharmacy JSON file
# instead of Google Sheets. The pipeline folder itself is not changed: this swaps in a stand-in
# "sheets_writer" module before main.py loads.
#
# Started by the Master Dashboard with the pipeline folder as the working directory and
# PHARMACY_DATA_FILE pointing at ~/Documents/Universal-Pharmacy/pharmacy-data.json.
import json
import os
import runpy
import sys
import types
import uuid
from datetime import datetime

DATA_FILE = os.environ["PHARMACY_DATA_FILE"]
sys.path.insert(0, os.getcwd())
try:
    from config import CONFIDENCE_THRESHOLD
except Exception:
    CONFIDENCE_THRESHOLD = 0.3


def _load():
    try:
        with open(DATA_FILE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _append(table, rows):
    d = _load()
    d.setdefault(table, []).extend({"id": uuid.uuid4().hex[:12], **r} for r in rows)
    tmp = DATA_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
    os.replace(tmp, DATA_FILE)


def _now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _write_exception(data, data_type, source_file, confidence):
    _append("exceptions", [{
        "Timestamp": _now(), "Type": data_type,
        "MR Name": data.get("mr_name", "") or data.get("customer_name", ""),
        "Date": data.get("date", ""), "Source File": source_file,
        "Confidence": round(confidence, 2),
        "Error/Issue": data.get("error", f"Low confidence: {confidence}"),
        "Raw Data": json.dumps(data, ensure_ascii=False)[:2000],
        "Status": "Needs Review",
    }])
    print(f"  ⚠ Exception logged — {source_file} (confidence: {confidence})")


def write_eod_report(data, source_file=""):
    confidence = data.get("confidence", 0.0)
    if confidence < CONFIDENCE_THRESHOLD or "error" in data:
        _write_exception(data, "eod_report", source_file, confidence)
        return "exception"
    _append("daily", [{
        "Date": data.get("date", ""), "MR Name": data.get("mr_name", ""), "HQ": data.get("hq", ""),
        "Working Area": ", ".join(data.get("working_area", [])), "Working With": data.get("working_with", "self"),
        "Total Calls (TC)": data.get("tc", 0), "Productive Calls (PC)": data.get("pc", 0), "POB (Rs)": data.get("pob", 0),
        "Stockist": data.get("stockist", ""), "Slip Count": len(data.get("matched_slips", [])),
        "Remarks": data.get("remarks", ""), "Confidence": round(confidence, 2),
        "Source File": source_file, "Timestamp": _now(), "Status": "Auto-Approved",
    }])
    print(f"  ✓ EOD report saved — {data.get('mr_name')} | {data.get('date')}")
    return "written"


def write_order_slips(slips, eod_mr="", eod_date=""):
    rows = []
    for slip in slips or []:
        confidence = slip.get("confidence", 0.0)
        if confidence < CONFIDENCE_THRESHOLD:
            _write_exception(slip, "order_slip", slip.get("source_file", ""), confidence)
            continue
        for order in slip.get("orders") or [{}]:
            rows.append({
                "Date": slip.get("date", eod_date), "MR Name": eod_mr or slip.get("linked_mr", ""),
                "Area": slip.get("area", ""), "Customer Name": slip.get("customer_name", ""),
                "Customer Type": slip.get("customer_type", ""), "Doctor Name": slip.get("doctor_name", ""),
                "Doctor Phone": slip.get("doctor_phone", ""), "Reg Number": slip.get("reg_number", ""),
                "Product (Raw)": order.get("product_raw", ""), "Product (Normalized)": order.get("product_normalized", ""),
                "Quantity": order.get("quantity", 0), "Unit": order.get("unit", ""),
                "Confidence": round(confidence, 2), "Source File": slip.get("source_file", ""),
                "Linked EOD": f"{eod_mr} | {eod_date}" if eod_mr else "", "Timestamp": _now(),
            })
    if rows:
        _append("orders", rows)
    print(f"  ✓ {len(rows)} order line(s) saved")
    return len(rows)


shim = types.ModuleType("sheets_writer")
shim.write_eod_report = write_eod_report
shim.write_order_slips = write_order_slips
shim._write_exception = _write_exception
sys.modules["sheets_writer"] = shim

sys.argv = ["main.py"] + sys.argv[1:]
runpy.run_path("main.py", run_name="__main__")
