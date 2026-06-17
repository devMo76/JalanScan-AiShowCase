# ============================================================
# JalanScan Ai — app.py
# Phase 3: Flask Core Server          ✅
# Phase 4: SQLite Database Setup      ✅
# Phase 5: AI Detection Function      ✅
# ============================================================

import os
import uuid
import sqlite3
from datetime import datetime
from flask import Flask, render_template, jsonify, request
from ultralytics import YOLO
import cv2

app = Flask(__name__)

MODEL_PATH = os.path.join("model", "road_damage.pt")

print("🔄 Loading YOLOv8 road damage model...")
model = YOLO(MODEL_PATH)
print(f"✅ Model loaded successfully from: {MODEL_PATH}")
print(f"   Classes: {model.names}")

DATABASE = "database.db"

# ── Class label map ──────────────────────────────────────────
# The .pt file has no named labels (class 0 = '0').
# We manually map class IDs to human-readable damage types here.
CLASS_LABEL_MAP = {
    0: "Pothole",
    1: "Longitudinal Crack",
    2: "Transverse Crack",
    3: "Alligator Crack",
}

# Severity colour map for OpenCV (BGR)
SEVERITY_COLOURS = {
    "High":   (0,   0,   220),   # Red
    "Medium": (0,   165, 255),   # Orange
    "Low":    (0,   200, 0),     # Green
}

# ── Database helpers ─────────────────────────────────────────
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


# ── PHASE 5: AI Detection Function ──────────────────────────
def detect_damage(image_path):
    """
    Run YOLOv8 inference on the given image.

    Returns a dict:
        {
            "damage_type":       str,   e.g. "Pothole"
            "confidence":        float, e.g. 0.87
            "severity":          str,   "High" / "Medium" / "Low"
            "result_image_path": str,   relative URL path for Flask static serving
            "detected":          bool   False if nothing was found
        }
    Returns None if the image file cannot be read.
    """

    # --- 1. Load image ---
    img = cv2.imread(image_path)
    if img is None:
        print(f"❌ Could not read image: {image_path}")
        return None

    # --- 2. Run YOLOv8 inference ---
    results = model(image_path, verbose=False)
    boxes   = results[0].boxes  # Boxes object

    # --- 3. Handle no-detection case ---
    if boxes is None or len(boxes) == 0:
        print("⚠️  No road damage detected in image.")

        # Save the original image unchanged as the result
        filename        = f"no_damage_{uuid.uuid4().hex[:8]}.jpg"
        result_abs_path = os.path.join("static", "results", filename)
        cv2.imwrite(result_abs_path, img)

        return {
            "damage_type":       "No Damage Detected",
            "confidence":        0.0,
            "severity":          "Low",
            "result_image_path": f"static/results/{filename}",
            "detected":          False,
        }

    # --- 4. Pick the highest-confidence detection ---
    # boxes.conf  → tensor of confidence scores
    # boxes.cls   → tensor of class indices
    # boxes.xyxy  → tensor of [x1, y1, x2, y2] bounding boxes
    confidences = boxes.conf.tolist()
    classes     = boxes.cls.tolist()
    xyxy        = boxes.xyxy.tolist()

    best_idx    = confidences.index(max(confidences))
    best_conf   = round(confidences[best_idx], 4)
    best_cls    = int(classes[best_idx])
    best_box    = xyxy[best_idx]

    # Map class ID → human label (fallback to generic name)
    damage_type = CLASS_LABEL_MAP.get(best_cls, f"Road Damage (Class {best_cls})")

    # --- 5. Assign severity ---
    if best_conf > 0.7:
        severity = "High"
    elif best_conf > 0.4:
        severity = "Medium"
    else:
        severity = "Low"

    colour = SEVERITY_COLOURS[severity]

    # --- 6. Draw ALL detected boxes on the image ---
    for i, (conf, cls, box) in enumerate(zip(confidences, classes, xyxy)):
        x1, y1, x2, y2 = map(int, box)
        c = int(cls)

        # Determine colour for this box
        if conf > 0.7:
            box_colour = SEVERITY_COLOURS["High"]
        elif conf > 0.4:
            box_colour = SEVERITY_COLOURS["Medium"]
        else:
            box_colour = SEVERITY_COLOURS["Low"]

        label_text = CLASS_LABEL_MAP.get(c, f"Class {c}")
        label      = f"{label_text} {conf:.0%}"

        # Draw filled rectangle header for label
        (text_w, text_h), baseline = cv2.getTextSize(
            label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2
        )
        cv2.rectangle(img, (x1, y1 - text_h - baseline - 4), (x1 + text_w, y1), box_colour, -1)

        # Draw bounding box
        cv2.rectangle(img, (x1, y1), (x2, y2), box_colour, 3)

        # Draw label text (white on coloured header)
        cv2.putText(
            img, label,
            (x1, y1 - baseline - 2),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6, (255, 255, 255), 2, cv2.LINE_AA
        )

    # --- 7. Add "JalanScan Ai" watermark (bottom-left) ---
    cv2.putText(
        img, "JalanScan Ai",
        (10, img.shape[0] - 10),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5, (255, 255, 255), 1, cv2.LINE_AA
    )

    # --- 8. Save annotated image ---
    filename        = f"result_{uuid.uuid4().hex[:8]}.jpg"
    result_abs_path = os.path.join("static", "results", filename)
    cv2.imwrite(result_abs_path, img)
    print(f"✅ Annotated image saved: {result_abs_path}")

    return {
        "damage_type":       damage_type,
        "confidence":        best_conf,
        "severity":          severity,
        "result_image_path": f"static/results/{filename}",
        "detected":          True,
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
    return jsonify({"status": "stub — Phase 6 coming"}), 200

@app.route("/api/reports", methods=["GET"])
def api_reports():
    return jsonify([])

# ── Quick test route for Phase 5 ─────────────────────────────
@app.route("/test-detect", methods=["GET"])
def test_detect():
    """
    GET /test-detect?img=<path>
    Quick browser test. Example:
        http://localhost:5000/test-detect?img=static/uploads/road1.jpg
    """
    img_path = request.args.get("img", "")
    if not img_path or not os.path.exists(img_path):
        return jsonify({"error": f"File not found: {img_path}"}), 400

    result = detect_damage(img_path)
    if result is None:
        return jsonify({"error": "Could not read image"}), 500

    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)