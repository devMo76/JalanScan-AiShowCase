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
from ultralytics import YOLO
import cv2

app = Flask(__name__)

MODEL_PATH = os.path.join("model", "road_damage.pt")

print("🔄 Loading YOLOv8 road damage model...")
model = YOLO(MODEL_PATH)
print(f"✅ Model loaded successfully from: {MODEL_PATH}")
print(f"   Classes: {model.names}")

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
            timestamp   TEXT    NOT NULL
        )
    """)
    conn.commit()
    conn.close()
    print("✅ Database ready — reports table OK")


with app.app_context():
    init_db()


def detect_damage(image_path):
    img = cv2.imread(image_path)
    if img is None:
        return None

    results = model(image_path, verbose=False)
    boxes = results[0].boxes

    if boxes is None or len(boxes) == 0:
        filename = f"no_damage_{uuid.uuid4().hex[:8]}.jpg"
        result_abs_path = os.path.join("static", "results", filename)
        cv2.imwrite(result_abs_path, img)
        return {
            "damage_type": "No Damage Detected",
            "confidence": 0.0,
            "severity": "Low",
            "result_image_path": f"static/results/{filename}",
            "detected": False,
        }

    confidences = boxes.conf.tolist()
    classes = boxes.cls.tolist()
    xyxy = boxes.xyxy.tolist()

    best_idx = confidences.index(max(confidences))
    best_conf = round(confidences[best_idx], 4)
    best_cls = int(classes[best_idx])
    damage_type = CLASS_LABEL_MAP.get(best_cls, f"Road Damage (Class {best_cls})")

    if best_conf > 0.7:
        severity = "High"
    elif best_conf > 0.4:
        severity = "Medium"
    else:
        severity = "Low"

    for conf, cls, box in zip(confidences, classes, xyxy):
        if conf < 0.5:
            continue
        x1, y1, x2, y2 = map(int, box)
        c = int(cls)
        if conf > 0.7:
            box_colour = SEVERITY_COLOURS["High"]
        elif conf > 0.4:
            box_colour = SEVERITY_COLOURS["Medium"]
        else:
            box_colour = SEVERITY_COLOURS["Low"]

        label_text = CLASS_LABEL_MAP.get(c, f"Class {c}")
        label = f"{label_text} {conf:.0%}"

        (text_w, text_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        cv2.rectangle(img, (x1, y1 - text_h - baseline - 4), (x1 + text_w, y1), box_colour, -1)
        cv2.rectangle(img, (x1, y1), (x2, y2), box_colour, 3)
        cv2.putText(img, label, (x1, y1 - baseline - 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)

    cv2.putText(img, "JalanScan Ai", (10, img.shape[0] - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

    filename = f"result_{uuid.uuid4().hex[:8]}.jpg"
    result_abs_path = os.path.join("static", "results", filename)
    cv2.imwrite(result_abs_path, img)

    return {
        "damage_type": damage_type,
        "confidence": best_conf,
        "severity": severity,
        "result_image_path": f"static/results/{filename}",
        "detected": True,
    }


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

        result = detect_damage(upload_path)
        if result is None:
            return jsonify({"success": False, "error": "Could not read image"}), 500

        conn = get_db()
        conn.execute("""
            INSERT INTO reports (image_path, damage_type, confidence, severity, latitude, longitude, status, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?)
        """, (
            result["result_image_path"],
            result["damage_type"],
            result["confidence"],
            result["severity"],
            latitude,
            longitude,
            datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ))
        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "damage_type": result["damage_type"],
            "confidence":  result["confidence"],
            "severity":    result["severity"],
            "result_image": "/" + result["result_image_path"]
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
        "SELECT id, damage_type, confidence, severity, latitude, longitude, status, timestamp "
        "FROM reports ORDER BY timestamp DESC"
    ).fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "damage_type", "confidence", "severity",
                     "latitude", "longitude", "status", "timestamp"])
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
    result = detect_damage(img_path)
    if result is None:
        return jsonify({"error": "Could not read image"}), 500
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)