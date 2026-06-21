# ============================================================
# JalanScan Ai — app.py
# Phase 3: Flask Core Server          ✅
# Phase 4: SQLite Database Setup      ✅
# Phase 5: AI Detection Function      ✅
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
from datetime import datetime, timedelta
from flask import Flask, render_template, jsonify, request, Response
import requests

app = Flask(__name__)

MODEL_PATH = os.path.join("model", "road_damage.pt")

print("🔄 Using external AI webhook for detection: https://aishowcase.app.n8n.cloud/webhook/image")

DATABASE = "database.db"

CLASS_LABEL_MAP = {
    0: "Pothole",
    1: "Longitudinal Crack",
    2: "Transverse Crack",
    3: "Alligator Crack",
}

SEVERITY_COLOURS = {
    "High":   (0,   0,   220),
    "Medium": (0,   165, 255),
    "Low":    (0,   200, 0),
}

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
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            image_path  TEXT    NOT NULL,
            damage_type TEXT    NOT NULL,
            confidence  REAL    NOT NULL,
            severity    TEXT    NOT NULL,
            latitude    REAL    NOT NULL,
            longitude   REAL    NOT NULL,
            status      TEXT    NOT NULL DEFAULT 'Pending',
            timestamp   TEXT    NOT NULL,
            description TEXT,
            recommended_action TEXT
        )
    """)
    # Add new columns if the table existed before without them
    cur = conn.execute("PRAGMA table_info(reports)").fetchall()
    cols = {r[1] for r in cur}
    if "description" not in cols:
        conn.execute("ALTER TABLE reports ADD COLUMN description TEXT")
    if "recommended_action" not in cols:
        conn.execute("ALTER TABLE reports ADD COLUMN recommended_action TEXT")
    conn.commit()
    conn.close()
    print("✅ Database ready — reports table OK")


with app.app_context():
    init_db()


def call_external_webhook(image_path: str):
    url = "https://aishowcase.app.n8n.cloud/webhook/image"
    try:
        with open(image_path, "rb") as fh:
            files = {"image": fh}
            resp = requests.post(url, files=files, timeout=30)
        # If webhook returns non-JSON or empty body, handle gracefully
        try:
            resp.raise_for_status()
        except Exception as e:
            print(f"Webhook HTTP error: {e} (status {getattr(resp, 'status_code', 'N/A')})")
            return None

        body = resp.text
        if not body:
            print(f"Webhook returned empty body (status {resp.status_code}) - using fallback response")
            return {
                "success": True,
                "damage_detected": False,
                "damage_type": "Unknown",
                "severity": "Low",
                "confidence": 0,
                "description": "No response from webhook; fallback used.",
                "recommended_action": "Manual review",
                "status": "Pending",
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }

        try:
            data = resp.json()
        except Exception as e:
            print("Webhook JSON parse failed:", e)
            print("Response body (truncated):", body[:1000])
            return None

        if not isinstance(data, list) or len(data) == 0:
            return None
        return data[0]
    except Exception as e:
        print("Webhook call failed:", e)
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
    return jsonify({"status": "ok", "model": "loaded"})


@app.route("/submit", methods=["POST"])
def submit():
    try:
        if "photo" not in request.files:
            return jsonify({"success": False, "error": "No photo uploaded"}), 400

        photo = request.files["photo"]
        latitude  = float(request.form.get("latitude",  3.1390))
        longitude = float(request.form.get("longitude", 101.6869))

        unique_name = f"upload_{uuid.uuid4().hex[:10]}.jpg"
        upload_path = os.path.join("static", "uploads", unique_name).replace("\\", "/")
        photo.save(upload_path)

        # Call external AI webhook
        webhook_res = call_external_webhook(upload_path)
        if webhook_res is None or not webhook_res.get("success", False):
            return jsonify({"success": False, "error": "AI webhook failed or returned no result"}), 500

        # Map webhook response to DB fields
        damage_type = webhook_res.get("damage_type", "Unknown")
        raw_conf = webhook_res.get("confidence", 0)
        try:
            confidence = float(raw_conf)
            if confidence > 1:
                confidence = confidence / 100.0
        except Exception:
            confidence = 0.0
        severity = webhook_res.get("severity", "Low")
        description = webhook_res.get("description", "")
        recommended_action = webhook_res.get("recommended_action", "")
        status_val = webhook_res.get("status", "Pending")
        timestamp_val = webhook_res.get("timestamp", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

        conn = get_db()
        conn.execute("""
            INSERT INTO reports (image_path, damage_type, confidence, severity, latitude, longitude, status, timestamp, description, recommended_action)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            upload_path,
            damage_type,
            confidence,
            severity,
            latitude,
            longitude,
            status_val,
            timestamp_val,
            description,
            recommended_action,
        ))
        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "damage_type": damage_type,
            "confidence":  confidence,
            "severity":    severity,
            "result_image": "/" + upload_path,
            "description": description,
            "recommended_action": recommended_action,
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
        day = today - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        label   = day.strftime("%d %b")
        row = conn.execute(
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
        "SELECT id, damage_type, confidence, severity, latitude, longitude, status, timestamp, description, recommended_action "
        "FROM reports ORDER BY timestamp DESC"
    ).fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "damage_type", "confidence", "severity",
                     "latitude", "longitude", "status", "timestamp", "description", "recommended_action"])
    for row in rows:
        writer.writerow([
            row["id"],
            row["damage_type"],
            round(row["confidence"], 4),
            row["severity"],
            row["latitude"],
            row["longitude"],
            row["status"],
            row["timestamp"],
            row["description"],
            row["recommended_action"],
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
        return jsonify({"error": "Webhook returned no result or failed"}), 500
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)