"""
JalanScan Ai — Showcase Seed Script v2
Generates real road damage JPEG images using Pillow (no downloads needed).
Seeds 50 reports across KL with working images.
Run from project root: python seed_showcase.py
"""

import os
import sqlite3
import random
import math
from datetime import datetime, timedelta

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    os.system("pip install Pillow --break-system-packages -q")
    from PIL import Image, ImageDraw, ImageFilter

DATABASE = "database.db"
UPLOADS_DIR = os.path.join("static", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


def draw_asphalt_texture(draw, width, height, seed=0):
    rng = random.Random(seed)
    for _ in range(6000):
        x = rng.randint(0, width)
        y = rng.randint(0, height)
        shade = rng.randint(35, 75)
        r = rng.randint(1, 3)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=(shade, shade, shade))


def generate_pothole_image(index):
    width, height = 640, 480
    img = Image.new("RGB", (width, height), (50, 50, 50))
    draw = ImageDraw.Draw(img)
    draw_asphalt_texture(draw, width, height, seed=index * 7)

    rng = random.Random(index)
    cx = rng.randint(220, 420)
    cy = rng.randint(160, 320)
    rx = rng.randint(55, 95)
    ry = rng.randint(45, 80)

    draw.ellipse([cx-rx-20, cy-ry-15, cx+rx+20, cy+ry+15],
                 fill=(30, 25, 20), outline=(90, 80, 70), width=3)
    draw.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], fill=(15, 10, 8))
    draw.ellipse([cx-rx+15, cy-ry+12, cx+rx-10, cy+ry-8], fill=(20, 15, 12))

    for _ in range(12):
        angle = rng.uniform(0, 2 * math.pi)
        length = rng.randint(20, 55)
        x1 = cx + int(rx * math.cos(angle))
        y1 = cy + int(ry * math.sin(angle))
        x2 = x1 + int(length * math.cos(angle))
        y2 = y1 + int(length * math.sin(angle))
        draw.line([(x1, y1), (x2, y2)], fill=(40, 35, 30), width=2)

    draw.rectangle([15, 15, 210, 58], fill=(0, 0, 0))
    draw.text((20, 20), "POTHOLE DETECTED", fill=(255, 100, 100))
    draw.text((20, 40), f"Ref: KL-{1000+index:04d}", fill=(160, 160, 160))

    img = img.filter(ImageFilter.GaussianBlur(radius=0.4))
    return img


def generate_longitudinal_crack_image(index):
    width, height = 640, 480
    img = Image.new("RGB", (width, height), (52, 52, 52))
    draw = ImageDraw.Draw(img)
    draw_asphalt_texture(draw, width, height, seed=index * 11)

    rng = random.Random(index * 5)
    x_base = rng.randint(280, 360)
    points = []
    y, x = 0, x_base
    while y < height:
        x += rng.randint(-6, 6)
        x = max(100, min(540, x))
        points.append((x, y))
        y += 12

    for i in range(len(points) - 1):
        draw.line([points[i], points[i+1]], fill=(25, 20, 18), width=rng.randint(3, 7))

    for i in range(0, len(points) - 1, 8):
        bx, by = points[i]
        branch_len = rng.randint(20, 60)
        angle = rng.uniform(-1.2, 1.2)
        ex = bx + int(branch_len * math.cos(angle))
        ey = by + int(branch_len * math.sin(angle))
        draw.line([(bx, by), (ex, ey)], fill=(35, 28, 25), width=2)

    draw.rectangle([15, 15, 240, 58], fill=(0, 0, 0))
    draw.text((20, 20), "LONGITUDINAL CRACK", fill=(137, 170, 204))
    draw.text((20, 40), f"Length: {rng.randint(8,25)}m", fill=(160, 160, 160))

    img = img.filter(ImageFilter.GaussianBlur(radius=0.3))
    return img


def generate_transverse_crack_image(index):
    width, height = 640, 480
    img = Image.new("RGB", (width, height), (48, 50, 48))
    draw = ImageDraw.Draw(img)
    draw_asphalt_texture(draw, width, height, seed=index * 17)

    rng = random.Random(index * 9)
    num_cracks = rng.randint(2, 4)
    for c in range(num_cracks):
        y_base = rng.randint(100 + c * 80, 140 + c * 80)
        points = []
        x, y = 0, y_base
        while x < width:
            y += rng.randint(-5, 5)
            y = max(y_base - 25, min(y_base + 25, y))
            points.append((x, y))
            x += 10
        for i in range(len(points) - 1):
            draw.line([points[i], points[i+1]], fill=(22, 18, 15), width=rng.randint(2, 5))
        for i in range(0, len(points), 6):
            px, py = points[i]
            s = rng.randint(3, 10)
            draw.ellipse([px-s, py-s, px+s, py+s], fill=(38, 32, 28))

    draw.rectangle([15, 15, 230, 58], fill=(0, 0, 0))
    draw.text((20, 20), "TRANSVERSE CRACK", fill=(74, 222, 128))
    draw.text((20, 40), f"Width: {rng.randint(3,18)}mm", fill=(160, 160, 160))

    img = img.filter(ImageFilter.GaussianBlur(radius=0.3))
    return img


def generate_alligator_crack_image(index):
    width, height = 640, 480
    img = Image.new("RGB", (width, height), (45, 45, 42))
    draw = ImageDraw.Draw(img)
    draw_asphalt_texture(draw, width, height, seed=index * 19)

    rng = random.Random(index * 23)
    for _ in range(35):
        x1 = rng.randint(80, 560)
        y1 = rng.randint(80, 400)
        angle = rng.uniform(0, math.pi)
        length = rng.randint(40, 120)
        x2 = x1 + int(length * math.cos(angle))
        y2 = y1 + int(length * math.sin(angle))
        draw.line([(x1, y1), (x2, y2)], fill=(20, 16, 14), width=rng.randint(1, 4))

    for _ in range(20):
        px = rng.randint(100, 540)
        py = rng.randint(100, 380)
        pr = rng.randint(5, 18)
        shade = rng.randint(25, 50)
        draw.ellipse([px-pr, py-pr, px+pr, py+pr], fill=(shade, shade-5, shade-8))

    draw.rectangle([15, 15, 240, 58], fill=(0, 0, 0))
    draw.text((20, 20), "ALLIGATOR CRACKING", fill=(250, 204, 21))
    draw.text((20, 40), "Structural failure", fill=(248, 113, 113))

    img = img.filter(ImageFilter.GaussianBlur(radius=0.4))
    return img


def generate_all_images():
    print("Generating road damage images with Pillow...")
    generators = [
        (generate_pothole_image,            0,  "Pothole A"),
        (generate_pothole_image,            50, "Pothole B"),
        (generate_longitudinal_crack_image, 0,  "Longitudinal Crack A"),
        (generate_longitudinal_crack_image, 50, "Longitudinal Crack B"),
        (generate_transverse_crack_image,   0,  "Transverse Crack A"),
        (generate_transverse_crack_image,   50, "Transverse Crack B"),
        (generate_alligator_crack_image,    0,  "Alligator Crack A"),
        (generate_alligator_crack_image,    50, "Alligator Crack B"),
    ]
    paths = []
    for i, (fn, seed, label) in enumerate(generators):
        filename = f"seed_img_{i+1:02d}.jpg"
        filepath = os.path.join(UPLOADS_DIR, filename)
        img = fn(seed)
        img.save(filepath, "JPEG", quality=88)
        size = os.path.getsize(filepath)
        print(f"  OK {filename} ({size // 1024}KB) - {label}")
        paths.append(filepath)
    print(f"  {len(paths)} images ready\n")
    return paths


KL_LOCATIONS = [
    (3.1478, 101.6953, "KLCC / Bukit Bintang"),
    (3.1466, 101.6930, "Jalan Ampang"),
    (3.1502, 101.7023, "Jalan Tun Razak"),
    (3.1390, 101.6869, "Masjid India"),
    (3.1319, 101.6841, "Chow Kit"),
    (3.1420, 101.6920, "Jalan Raja Laut"),
    (3.1073, 101.6067, "PJ Old Town"),
    (3.1215, 101.6234, "SS2 Petaling Jaya"),
    (3.0980, 101.5823, "Subang Jaya"),
    (3.1567, 101.5934, "Damansara Utama"),
    (3.1689, 101.6123, "Bukit Damansara"),
    (3.0934, 101.7345, "Cheras"),
    (3.1123, 101.7567, "Ampang"),
    (3.0823, 101.7234, "Taman Connaught"),
    (3.0756, 101.7456, "Batu 9 Cheras"),
    (3.2134, 101.6456, "Kepong"),
    (3.1834, 101.6234, "Mont Kiara"),
    (3.2012, 101.6789, "Sri Damansara"),
    (3.2234, 101.6345, "Batu Caves vicinity"),
    (3.1234, 101.6712, "Bangsar"),
    (3.1312, 101.6867, "KL Sentral area"),
    (3.1089, 101.6634, "Kerinchi"),
    (3.1178, 101.6534, "Pantai Dalam"),
    (3.2045, 101.7234, "Wangsa Maju"),
    (3.1934, 101.7123, "Setapak"),
    (3.2156, 101.7345, "Gombak"),
    (3.1234, 101.7456, "Pandan Indah"),
    (3.1567, 101.7234, "Keramat"),
    (3.1412, 101.7345, "Taman Maluri"),
    (3.0234, 101.6234, "Puchong"),
    (3.0456, 101.5834, "USJ Subang"),
    (3.0678, 101.6456, "Sri Petaling"),
    (3.0345, 101.6123, "Bukit Jalil"),
    (3.2567, 101.5934, "Rawang"),
    (3.2345, 101.6234, "Selayang"),
    (2.9934, 101.7867, "Kajang"),
    (2.9678, 101.7234, "Serdang"),
    (3.0123, 101.7456, "Bangi"),
    (3.0456, 101.4456, "Klang"),
    (3.0234, 101.4678, "Port Klang"),
    (2.9264, 101.6964, "Putrajaya"),
    (2.9234, 101.6534, "Cyberjaya"),
    (3.0734, 101.5178, "Shah Alam"),
    (3.0456, 101.5456, "Setia Alam"),
    (3.1623, 101.7123, "Titiwangsa"),
    (3.1789, 101.6867, "Sentul"),
    (3.1956, 101.6678, "Jalan Ipoh"),
    (3.1345, 101.7012, "Kampung Pandan"),
    (3.1078, 101.7089, "Desa Pandan"),
    (3.0912, 101.6912, "Salak South"),
]

DAMAGE_TYPES = [
    {
        "type": "Pothole",
        "descriptions": [
            "Deep pothole causing vehicle damage risk. Water pooling observed.",
            "Large pothole spanning half the lane width. Urgent repair needed.",
            "Multiple potholes in close proximity. Road surface severely degraded.",
            "Pothole with sharp edges. Tyre puncture hazard for motorcyclists.",
        ],
        "actions": [
            "Immediate patching required. Apply hot mix asphalt.",
            "Emergency repair needed within 24 hours. High traffic zone.",
            "Schedule crack sealing followed by full depth patching.",
            "Mill and fill repair recommended. Apply tack coat first.",
        ],
        "severity_weights": ["High", "High", "Medium", "High"],
        "image_indices": [0, 1],
    },
    {
        "type": "Longitudinal Crack",
        "descriptions": [
            "Longitudinal crack running parallel to road centreline. 12m length.",
            "Fatigue cracking along wheel path. Structural failure developing.",
            "Edge cracking near shoulder. Drainage issue contributing to damage.",
            "Long crack with spalling. Water infiltration risk.",
        ],
        "actions": [
            "Apply crack sealant. Monitor for further spreading.",
            "Full depth reclamation recommended for this section.",
            "Improve edge drainage then seal crack with rubberised filler.",
            "Clean crack and apply hot pour bituminous sealant.",
        ],
        "severity_weights": ["Medium", "High", "Medium", "Low"],
        "image_indices": [2, 3],
    },
    {
        "type": "Transverse Crack",
        "descriptions": [
            "Thermal transverse crack perpendicular to traffic direction.",
            "Multiple transverse cracks at regular intervals. Thermal cycling damage.",
            "Wide transverse crack with debris ingress. Immediate sealing required.",
            "Transverse crack with secondary branching cracks forming.",
        ],
        "actions": [
            "Rout and seal with polymer-modified bitumen.",
            "Apply geotextile reinforcement before overlay.",
            "Clean debris, dry crack, and apply cold pour sealant.",
            "Schedule preventive maintenance overlay for this corridor.",
        ],
        "severity_weights": ["Low", "Medium", "Medium", "High"],
        "image_indices": [4, 5],
    },
    {
        "type": "Alligator Crack",
        "descriptions": [
            "Alligator cracking indicating base layer failure. Immediate action needed.",
            "Extensive fatigue cracking across full lane width. Road failing.",
            "Block cracking pattern with loose aggregate. Surface unstable.",
            "Severe alligator cracking with pothole formation beginning.",
        ],
        "actions": [
            "Full depth repair required. Remove and replace base material.",
            "Structural overlay after base stabilisation.",
            "Mill existing surface, address subgrade, lay new pavement.",
            "Emergency closure recommended. Full reconstruction needed.",
        ],
        "severity_weights": ["High", "High", "High", "Medium"],
        "image_indices": [6, 7],
    },
]

STATUS_OPTIONS = ["Pending", "Pending", "Pending", "In Progress", "Fixed"]


def seed_reports(image_paths):
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row

    existing = conn.execute("SELECT COUNT(*) as cnt FROM reports").fetchone()["cnt"]
    print(f"Existing reports in DB: {existing}")
    print("Seeding 50 showcase reports...\n")

    base_date = datetime.now() - timedelta(days=30)
    inserted = 0

    for i, location in enumerate(KL_LOCATIONS[:50]):
        lat, lng, area = location
        damage_info = DAMAGE_TYPES[i % len(DAMAGE_TYPES)]
        damage_type = damage_info["type"]
        severity = random.choice(damage_info["severity_weights"])

        if severity == "High":
            confidence = round(random.uniform(0.75, 0.96), 4)
        elif severity == "Medium":
            confidence = round(random.uniform(0.50, 0.74), 4)
        else:
            confidence = round(random.uniform(0.30, 0.49), 4)

        description = random.choice(damage_info["descriptions"])
        recommended_action = random.choice(damage_info["actions"])
        status = random.choice(STATUS_OPTIONS)

        days_ago = random.randint(0, 29)
        hours_ago = random.randint(0, 23)
        timestamp = (base_date + timedelta(days=days_ago, hours=hours_ago)).strftime("%Y-%m-%d %H:%M:%S")

        img_idx = damage_info["image_indices"][i % len(damage_info["image_indices"])]
        image_path = image_paths[img_idx].replace("\\", "/")

        lat_j = lat + random.uniform(-0.0008, 0.0008)
        lng_j = lng + random.uniform(-0.0008, 0.0008)

        conn.execute(
            """INSERT INTO reports (
                image_path, public_url, damage_type, confidence, severity,
                latitude, longitude, status, timestamp,
                description, recommended_action, thumbnail_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (image_path, None, damage_type, confidence, severity,
             round(lat_j, 6), round(lng_j, 6), status, timestamp,
             description, recommended_action, image_path),
        )
        inserted += 1
        icon = "R" if severity == "High" else "Y" if severity == "Medium" else "G"
        print(f"  [{i+1:02d}] [{icon}] {damage_type:<22} | {severity:<6} | {area}")

    conn.commit()
    total = conn.execute("SELECT COUNT(*) as cnt FROM reports").fetchone()["cnt"]
    conn.close()
    print(f"\nInserted {inserted} reports. Total in DB: {total}")


if __name__ == "__main__":
    print("=" * 55)
    print("  JalanScan Ai Showcase Seed v2 - Pillow Images")
    print("=" * 55 + "\n")
    image_paths = generate_all_images()
    seed_reports(image_paths)
    print("\nDone! Check the dashboard.")