# ============================================================
# JalanScan Ai — app.py
# Phase 3: Flask Core Server          ✅
# Phase 4: SQLite Database Setup      ✅
# Phase 5: AI Detection (n8n webhook) ✅
# Phase 6: Submit Route (/submit)     ✅
# Phase 10: /api/stats/weekly         ✅
# Phase 10: /api/export/csv           ✅
# Phase 13: Status Tracking           ✅
# ============================================================

import os
import csv
import uuid
import sqlite3
import io
import logging
from datetime import datetime, timedelta
from flask import Flask, render_template, jsonify, request, Response
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

try:
    from flask_cors import CORS
    cors_available = True
except Exception:
    cors_available = False

try:
    from PIL import Image
    pil_available = True
except Exception:
    pil_available = False

app = Flask(__name__)
if cors_available:
    CORS(app)


@app.after_request
def _allow_cors(response):
    if not cors_available:
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    return response


print("🔄 Using external AI webhook for detection: https://aishowcase.app.n8n.cloud/webhook/image")

DATABASE = "database.db"

os.makedirs(os.path.join("static", "uploads"), exist_ok=True)
os.makedirs(os.path.join("static", "results"), exist_ok=True)


def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id                 INTEGER PRIMARY KEY AUTOINCREMENT,
            image_path         TEXT    NOT NULL,
            public_url         TEXT,
            damage_type        TEXT    NOT NULL,
            confidence         REAL    NOT NULL,
            severity           TEXT    NOT NULL,
            latitude           REAL    NOT NULL,
            longitude          REAL    NOT NULL,
            status             TEXT    NOT NULL DEFAULT 'Pending',
            timestamp          TEXT    NOT NULL,
            description        TEXT,
            recommended_action TEXT,
            thumbnail_path     TEXT
        )
    """)
    cur = conn.execute("PRAGMA table_info(reports)").fetchall()
    cols = {r[1] for r in cur}
    for col, definition in [
        ("description",        "TEXT"),
        ("recommended_action", "TEXT"),
        ("thumbnail_path",     "TEXT"),
        ("public_url",         "TEXT"),
    ]:
        if col not in cols:
            conn.execute(f"ALTER TABLE reports ADD COLUMN {col} {definition}")
    conn.commit()
    conn.close()
    print("✅ Database ready — reports table OK")


with app.app_context():
    init_db()


def call_external_webhook(image_path: str):
    url = "https://aishowcase.app.n8n.cloud/webhook/image"
    session = requests.Session()
    retries = Retry(total=3, backoff_factor=1, status_forcelist=[502, 503, 504])
    session.mount("https://", HTTPAdapter(max_retries=retries))
    try:
        with open(image_path, "rb") as fh:
            file_bytes = fh.read()
        files = {"image": ("image.jpg", file_bytes, "image/jpeg")}
        resp = session.post(url, files=files, timeout=30)
        resp.raise_for_status()
        if not resp.text:
            return None
        data = resp.json()
        if isinstance(data, list) and len(data) > 0:
            return data[0]
        if isinstance(data, dict):
            return data
        return None
    except Exception as e:
        logging.exception("Webhook call failed: %s", e)
        return None


def upload_to_0x0(file_path: str):
    try:
        with open(file_path, "rb") as fh:
            r = requests.post("https://0x0.st", files={"file": fh}, timeout=30)
        if r.status_code == 200 and r.text.strip().startswith("http"):
            return r.text.strip()
    except Exception:
        logging.exception("Public upload to 0x0.st failed")
    return None


# ── Routes ───────────────────────────────────────────────────

@app.route("/")
def citizen():
    return render_template("citizen.html")


@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")


@app.route("/health")
def health():
    return jsonify({"status": "ok", "model": "webhook"})


@app.route("/submit", methods=["POST"])
def submit():
    try:
        if "photo" not in request.files:
            return jsonify({"success": False, "error": "No photo uploaded"}), 400

        photo = request.files["photo"]
        if not photo.mimetype.startswith("image/"):
            return jsonify({"success": False, "error": "Uploaded file is not an image"}), 400

        photo.stream.seek(0, io.SEEK_END)
        size = photo.stream.tell()
        photo.stream.seek(0)
        if size > 10 * 1024 * 1024:
            return jsonify({"success": False, "error": "File too large (max 10MB)"}), 400

        latitude  = float(request.form.get("latitude",  3.1390))
        longitude = float(request.form.get("longitude", 101.6869))

        unique_name = f"upload_{uuid.uuid4().hex[:10]}.jpg"
        upload_path = os.path.join("static", "uploads", unique_name).replace("\\", "/")
        photo.save(upload_path)

        public_url = upload_to_0x0(upload_path)
        webhook_res = call_external_webhook(upload_path)

        if not webhook_res:
            webhook_res = {
                "damage_type": "Unknown",
                "confidence": 0,
                "severity": "Low",
                "description": "No webhook result",
                "recommended_action": "Manual review",
                "status": "Pending",
            }

        damage_type        = webhook_res.get("damage_type", "Unknown")
        raw_conf           = webhook_res.get("confidence", 0)
        try:
            confidence = float(raw_conf)
            if confidence > 1:
                confidence = confidence / 100.0
        except Exception:
            confidence = 0.0
        severity           = webhook_res.get("severity", "Low")
        description        = webhook_res.get("description", "")
        recommended_action = webhook_res.get("recommended_action", "")
        status_val         = webhook_res.get("status", "Pending")
        timestamp_val      = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        result_image_field = webhook_res.get("result_image") or webhook_res.get("annotated_image")
        if result_image_field:
            try:
                if isinstance(result_image_field, str) and result_image_field.startswith("data:image"):
                    import base64
                    _, b64 = result_image_field.split(",", 1)
                    filename = f"result_{uuid.uuid4().hex[:8]}.jpg"
                    result_abs_path = os.path.join("static", "results", filename)
                    with open(result_abs_path, "wb") as outfh:
                        outfh.write(base64.b64decode(b64))
                    upload_path = result_abs_path.replace("\\", "/")
                elif isinstance(result_image_field, str) and result_image_field.startswith("http"):
                    rimg = requests.get(result_image_field, timeout=15)
                    rimg.raise_for_status()
                    if "image" in rimg.headers.get("Content-Type", ""):
                        filename = f"result_{uuid.uuid4().hex[:8]}.jpg"
                        result_abs_path = os.path.join("static", "results", filename)
                        with open(result_abs_path, "wb") as outfh:
                            outfh.write(rimg.content)
                        upload_path = result_abs_path.replace("\\", "/")
            except Exception:
                logging.exception("Failed to save annotated image from webhook")

        thumbnail_path = None
        if pil_available:
            try:
                im = Image.open(upload_path)
                im.thumbnail((480, 360))
                thumb_name = f"thumb_{uuid.uuid4().hex[:8]}.jpg"
                thumb_abs  = os.path.join("static", "results", thumb_name)
                im.save(thumb_abs, format="JPEG", quality=80)
                thumbnail_path = thumb_abs.replace("\\", "/")
            except Exception:
                logging.exception("Failed to create thumbnail")

        conn = get_db()
        conn.execute("""
            INSERT INTO reports
                (image_path, public_url, damage_type, confidence, severity,
                 latitude, longitude, status, timestamp,
                 description, recommended_action, thumbnail_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            upload_path, public_url, damage_type, confidence, severity,
            latitude, longitude, status_val, timestamp_val,
            description, recommended_action, thumbnail_path,
        ))
        conn.commit()
        conn.close()

        return jsonify({
            "success":            True,
            "damage_type":        damage_type,
            "confidence":         confidence,
            "severity":           severity,
            "result_image":       "/" + upload_path,
            "description":        description,
            "recommended_action": recommended_action,
            "public_url":         public_url,
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/reports", methods=["GET"])
def api_reports():
    conn = get_db()
    rows = conn.execute("SELECT * FROM reports ORDER BY timestamp DESC").fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


# ── Phase 10: Weekly stats ────────────────────────────────────
@app.route("/api/stats/weekly", methods=["GET"])
def api_stats_weekly():
    conn = get_db()
    today = datetime.now().date()
    result = []
    for i in range(6, -1, -1):
        day     = today - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        label   = day.strftime("%d %b")
        row     = conn.execute(
            "SELECT COUNT(*) as cnt FROM reports WHERE timestamp LIKE ?",
            (f"{day_str}%",)
        ).fetchone()
        result.append({"date": label, "count": row["cnt"]})
    conn.close()
    return jsonify(result)


# ── Phase 10: Export CSV ──────────────────────────────────────
@app.route("/api/export/csv", methods=["GET"])
def api_export_csv():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, image_path, public_url, damage_type, confidence, severity, "
        "latitude, longitude, status, timestamp, description, recommended_action "
        "FROM reports ORDER BY timestamp DESC"
    ).fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "image_path", "public_url", "damage_type", "confidence",
                     "severity", "latitude", "longitude", "status", "timestamp",
                     "description", "recommended_action"])
    for row in rows:
        writer.writerow([
            row["id"], row["image_path"], row["public_url"],
            row["damage_type"], round(row["confidence"], 4),
            row["severity"], row["latitude"], row["longitude"],
            row["status"], row["timestamp"],
            row["description"], row["recommended_action"],
        ])

    output.seek(0)
    filename = f"jalanscan_reports_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ── Phase 13: Status Tracking ─────────────────────────────────
@app.route("/api/report/<int:report_id>/status", methods=["PATCH", "OPTIONS"])
def update_status(report_id):
    if request.method == "OPTIONS":
        return "", 204
    data = request.get_json()
    new_status = data.get("status", "")
    if new_status not in ("Pending", "In Progress", "Fixed"):
        return jsonify({"success": False, "error": "Invalid status"}), 400
    conn = get_db()
    conn.execute("UPDATE reports SET status = ? WHERE id = ?", (new_status, report_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "status": new_status})


# ── Dev/test helpers ──────────────────────────────────────────
@app.route("/test-detect", methods=["GET"])
def test_detect():
    img_path = request.args.get("img", "")
    if not img_path or not os.path.exists(img_path):
        return jsonify({"error": f"File not found: {img_path}"}), 400
    result = call_external_webhook(img_path)
    if result is None:
        return jsonify({"error": "Webhook returned no result"}), 500
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)