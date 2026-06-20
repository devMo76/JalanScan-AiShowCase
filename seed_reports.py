import sqlite3
from datetime import datetime, timedelta
import random

conn = sqlite3.connect("database.db")

samples = [
    (3.1390, 101.6869, "Pothole",            0.89, "High"),
    (3.1400, 101.6880, "Pothole",            0.85, "High"),
    (3.1380, 101.6860, "Alligator Crack",    0.76, "High"),
    (3.1370, 101.6890, "Pothole",            0.82, "High"),
    (3.1410, 101.6850, "Longitudinal Crack", 0.65, "Medium"),
    (3.1360, 101.6900, "Transverse Crack",   0.58, "Medium"),
    (3.1420, 101.6870, "Pothole",            0.91, "High"),
    (3.1395, 101.6855, "Alligator Crack",    0.73, "High"),
    (3.1350, 101.6840, "Pothole",            0.44, "Medium"),
    (3.1430, 101.6910, "Longitudinal Crack", 0.38, "Low"),
    (3.1500, 101.7020, "Pothole",            0.87, "High"),
    (3.1510, 101.7030, "Pothole",            0.83, "High"),
    (3.1490, 101.7010, "Alligator Crack",    0.79, "High"),
    (3.1280, 101.6750, "Pothole",            0.66, "Medium"),
    (3.1290, 101.6760, "Transverse Crack",   0.55, "Medium"),
]

for lat, lng, dtype, conf, sev in samples:
    days_ago = random.randint(0, 6)
    ts = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d %H:%M:%S")
    conn.execute("""
        INSERT INTO reports (image_path, damage_type, confidence, severity, latitude, longitude, status, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?)
    """, ("static/results/sample.jpg", dtype, conf, sev, lat, lng, ts))

conn.commit()
conn.close()
print("✅ 15 sample reports inserted")