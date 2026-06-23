import sqlite3
from datetime import datetime, timedelta
import random

conn = sqlite3.connect("database.db")

samples = [
    # ── Kuala Lumpur City Centre cluster ─────────────────────
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

    # ── Chow Kit / Titiwangsa ────────────────────────────────
    (3.1500, 101.7020, "Pothole",            0.87, "High"),
    (3.1510, 101.7030, "Pothole",            0.83, "High"),
    (3.1490, 101.7010, "Alligator Crack",    0.79, "High"),
    (3.1520, 101.7040, "Transverse Crack",   0.61, "Medium"),
    (3.1480, 101.7000, "Pothole",            0.92, "High"),
    (3.1530, 101.7050, "Longitudinal Crack", 0.55, "Medium"),
    (3.1470, 101.6990, "Pothole",            0.48, "Medium"),
    (3.1540, 101.7060, "Alligator Crack",    0.71, "High"),

    # ── Bangsar / Kerinchi ───────────────────────────────────
    (3.1280, 101.6750, "Pothole",            0.66, "Medium"),
    (3.1290, 101.6760, "Transverse Crack",   0.55, "Medium"),
    (3.1270, 101.6740, "Pothole",            0.88, "High"),
    (3.1260, 101.6730, "Alligator Crack",    0.74, "High"),
    (3.1300, 101.6770, "Longitudinal Crack", 0.42, "Medium"),
    (3.1310, 101.6780, "Pothole",            0.35, "Low"),
    (3.1250, 101.6720, "Pothole",            0.81, "High"),

    # ── Kepong / Batu ────────────────────────────────────────
    (3.2100, 101.6360, "Pothole",            0.90, "High"),
    (3.2110, 101.6370, "Alligator Crack",    0.78, "High"),
    (3.2090, 101.6350, "Pothole",            0.86, "High"),
    (3.2120, 101.6380, "Transverse Crack",   0.63, "Medium"),
    (3.2080, 101.6340, "Pothole",            0.51, "Medium"),
    (3.2130, 101.6390, "Longitudinal Crack", 0.40, "Low"),

    # ── Ampang / Pandan ──────────────────────────────────────
    (3.1480, 101.7500, "Pothole",            0.84, "High"),
    (3.1490, 101.7510, "Alligator Crack",    0.77, "High"),
    (3.1470, 101.7490, "Pothole",            0.69, "Medium"),
    (3.1500, 101.7520, "Transverse Crack",   0.57, "Medium"),
    (3.1460, 101.7480, "Pothole",            0.93, "High"),
    (3.1510, 101.7530, "Longitudinal Crack", 0.36, "Low"),

    # ── Petaling Jaya / Damansara ────────────────────────────
    (3.1060, 101.6360, "Pothole",            0.88, "High"),
    (3.1070, 101.6370, "Alligator Crack",    0.80, "High"),
    (3.1050, 101.6350, "Pothole",            0.72, "High"),
    (3.1080, 101.6380, "Transverse Crack",   0.60, "Medium"),
    (3.1040, 101.6340, "Pothole",            0.47, "Medium"),
    (3.1090, 101.6390, "Longitudinal Crack", 0.33, "Low"),

    # ── Setapak / Wangsa Maju ────────────────────────────────
    (3.1950, 101.7200, "Pothole",            0.86, "High"),
    (3.1960, 101.7210, "Alligator Crack",    0.75, "High"),
    (3.1940, 101.7190, "Pothole",            0.64, "Medium"),
    (3.1970, 101.7220, "Transverse Crack",   0.53, "Medium"),
    (3.1930, 101.7180, "Pothole",            0.91, "High"),

    # ── Cheras / Salak South ─────────────────────────────────
    (3.0900, 101.7200, "Pothole",            0.83, "High"),
    (3.0910, 101.7210, "Alligator Crack",    0.76, "High"),
    (3.0890, 101.7190, "Pothole",            0.67, "Medium"),
    (3.0920, 101.7220, "Longitudinal Crack", 0.49, "Medium"),
    (3.0880, 101.7180, "Pothole",            0.38, "Low"),

    # ── Sri Petaling / Bukit Jalil ───────────────────────────
    (3.0600, 101.6900, "Pothole",            0.89, "High"),
    (3.0610, 101.6910, "Alligator Crack",    0.81, "High"),
    (3.0590, 101.6890, "Pothole",            0.70, "High"),
    (3.0620, 101.6920, "Transverse Crack",   0.56, "Medium"),
    (3.0580, 101.6880, "Pothole",            0.43, "Medium"),

    # ── Mont Kiara / Sri Hartamas ────────────────────────────
    (3.1680, 101.6540, "Pothole",            0.85, "High"),
    (3.1690, 101.6550, "Longitudinal Crack", 0.62, "Medium"),
    (3.1670, 101.6530, "Pothole",            0.78, "High"),
    (3.1700, 101.6560, "Transverse Crack",   0.50, "Medium"),
    (3.1660, 101.6520, "Pothole",            0.37, "Low"),
]

statuses = ["Pending", "Pending", "Pending", "In Progress", "Fixed"]

for lat, lng, dtype, conf, sev in samples:
    days_ago = random.randint(0, 6)
    ts = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d %H:%M:%S")
    status = random.choice(statuses)
    conn.execute("""
        INSERT INTO reports (image_path, damage_type, confidence, severity, latitude, longitude, status, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, ("", dtype, conf, sev, lat, lng, status, ts))

conn.commit()
conn.close()
print(f"✅ {len(samples)} sample reports inserted across KL")