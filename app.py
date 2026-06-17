# ============================================================
# JalanScan Ai — app.py
# Phase 3: Flask Core Server  ✅
# Phase 4: SQLite Database Setup  ✅
# ============================================================

import os
import sqlite3
from datetime import datetime
from flask import Flask, render_template, jsonify, request
from ultralytics import YOLO

# ── App init ─────────────────────────────────────────────────
app = Flask(__name__)

# ── Phase 2: Load YOLOv8 model ───────────────────────────────
MODEL_PATH = os.path.join("model", "road_damage.pt")

print("🔄 Loading YOLOv8 road damage model...")
model = YOLO(MODEL_PATH)
print(f"✅ Model loaded successfully from: {MODEL_PATH}")
print(f"   Classes: {model.names}")

# ── Phase 4: Database ─────────────────────────────────────────
DATABASE = "database.db"

def get_db():
    """Open a DB connection where columns are accessible by name."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Create the reports table if it doesn't already exist."""
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

# ── Phase 3: Core routes ──────────────────────────────────────

@app.route("/")
def citizen():
    return render_template("citizen.html")

@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

@app.route("/health")
def health():
    return jsonify({"status": "ok", "model": "loaded"})

# ── Phase 3 stubs (filled in Phase 6 + Phase 10) ─────────────

@app.route("/submit", methods=["POST"])
def submit():
    # Phase 6 will fill this in
    return jsonify({"status": "stub — Phase 6 coming"}), 200

@app.route("/api/reports", methods=["GET"])
def api_reports():
    # Phase 10 will fill this in
    return jsonify([])

# ── Run ───────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)