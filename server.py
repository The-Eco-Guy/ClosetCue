"""
ClosetCue — Local Development & Demonstration Server
Emulates the PHP 8 + MySQL environment with zero dependencies.
Provides real-time database persistence, file uploads, filtering,
analytics, outfit recommendations, and wear logging.
"""

import http.server
import socketserver
import urllib.parse
import json
import sqlite3
import os
import mimetypes
import webbrowser
import datetime
import uuid
import re

PORT = int(os.environ.get("PORT", "8001"))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("CLOSETCUE_DB_PATH", os.path.join(BASE_DIR, "closetcue.db"))
UPLOADS_DIR = os.environ.get("CLOSETCUE_UPLOADS_DIR", os.path.join(BASE_DIR, "uploads"))
LOCAL_TIMEZONE = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

def local_today():
    return datetime.datetime.now(LOCAL_TIMEZONE).date()

os.makedirs(UPLOADS_DIR, exist_ok=True)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    # Seed only a newly created wardrobe, never one the user has emptied.
    cur.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'garments'")
    new_database = cur.fetchone() is None
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS garments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            garment_name TEXT NOT NULL,
            category TEXT NOT NULL,
            color_family TEXT NOT NULL,
            color_name TEXT NOT NULL,
            fabric TEXT NOT NULL,
            occasion TEXT NOT NULL,
            shelf_location TEXT NOT NULL,
            image_path TEXT NOT NULL,
            alt_text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS wear_history (
            log_id INTEGER PRIMARY KEY AUTOINCREMENT,
            garment_id INTEGER NOT NULL,
            worn_date DATE NOT NULL,
            event_note TEXT DEFAULT 'Daily Wear',
            FOREIGN KEY (garment_id) REFERENCES garments(id) ON DELETE CASCADE
        );
    """)

    if new_database:
        # Pre-seed 10 garments
        garments_data = [
            (1, 'Crimson Chikankari Kurta', 'Top', 'Warm', 'Crimson Red', 'Cotton', 'Festive', 'Shelf A – Top Row', 'uploads/kurta1.jpg', 'Crimson Red Cotton Top for Festive wear, stored at Shelf A – Top Row'),
            (2, 'Classic Indigo Slim Jeans', 'Bottom', 'Cool', 'Indigo Blue', 'Denim', 'Casual', 'Shelf B – Middle Row', 'uploads/jeans1.jpg', 'Indigo Blue Denim Bottom for Casual wear, stored at Shelf B – Middle Row'),
            (3, 'Ivory Linen Palazzo', 'Bottom', 'Neutral', 'Ivory White', 'Linen', 'Summery', 'Shelf B – Bottom Row', 'uploads/palazzo1.jpg', 'Ivory White Linen Bottom for Summery wear, stored at Shelf B – Bottom Row'),
            (4, 'Black Formal Oxford Shoes', 'Footwear', 'Neutral', 'Jet Black', 'Leather', 'Formal', 'Shoe Rack – Slot 1', 'uploads/oxford1.jpg', 'Jet Black Leather Footwear for Formal wear, stored at Shoe Rack – Slot 1'),
            (5, 'Navy Blue Satin Jumpsuit', 'One-Piece', 'Cool', 'Navy Blue', 'Satin', 'Party', 'Shelf C – Top Row', 'uploads/jumpsuit1.jpg', 'Navy Blue Satin One-Piece for Party wear, stored at Shelf C – Top Row'),
            (6, 'Olive Cargo Joggers', 'Bottom', 'Warm', 'Olive Green', 'Twill', 'Casual', 'Shelf B – Top Row', 'uploads/joggers1.jpg', 'Olive Green Twill Bottom for Casual wear, stored at Shelf B – Top Row'),
            (7, 'Pearl Grey Formal Blazer', 'Top', 'Neutral', 'Pearl Grey', 'Polyester Blend', 'Formal', 'Shelf A – Middle Row', 'uploads/blazer1.jpg', 'Pearl Grey Polyester Blend Top for Formal wear, stored at Shelf A – Middle Row'),
            (8, 'Sunset Orange Anarkali Suit', 'One-Piece', 'Warm', 'Sunset Orange', 'Georgette', 'Festive', 'Shelf C – Middle Row', 'uploads/anarkali1.jpg', 'Sunset Orange Georgette One-Piece for Festive wear, stored at Shelf C – Middle Row'),
            (9, 'Teal Silk Wrap Blouse', 'Top', 'Cool', 'Teal Blue', 'Silk', 'Party', 'Shelf A – Bottom Row', 'uploads/blouse1.jpg', 'Teal Blue Silk Top for Party wear, stored at Shelf A – Bottom Row'),
            (10, 'Tan Suede Loafers', 'Footwear', 'Warm', 'Tan Brown', 'Suede', 'Casual', 'Shoe Rack – Slot 3', 'uploads/loafers1.jpg', 'Tan Brown Suede Footwear for Casual wear, stored at Shoe Rack – Slot 3')
        ]
        cur.executemany("INSERT INTO garments (id, garment_name, category, color_family, color_name, fabric, occasion, shelf_location, image_path, alt_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", garments_data)

        # Pre-seed 18 wear logs
        wear_data = [
            (1, '2026-10-02', 'Diwali Prep Party'),
            (1, '2026-10-06', 'Family Dinner'),
            (1, '2026-10-10', 'Office Ethnic Day'),
            (1, '2026-10-15', 'Navratri Celebration'),
            (1, '2026-10-20', 'College Fest'),
            (1, '2026-10-27', 'Diwali Evening'),
            (2, '2026-10-01', 'Daily Wear'),
            (2, '2026-10-07', 'Weekend Outing'),
            (2, '2026-10-12', 'Movie Night'),
            (2, '2026-10-19', 'Café Meetup'),
            (2, '2026-10-25', 'Daily Wear'),
            (5, '2026-10-05', 'Birthday Party'),
            (5, '2026-10-22', 'House Party'),
            (6, '2026-10-14', 'Gym Session'),
            (7, '2026-10-28', 'Client Presentation'),
            (9, '2026-10-26', 'Cocktail Night'),
            (9, '2026-10-29', 'Office Party'),
            (10, '2026-10-29', 'Brunch Outing')
        ]
        cur.executemany("INSERT INTO wear_history (garment_id, worn_date, event_note) VALUES (?, ?, ?)", wear_data)
        conn.commit()

    conn.close()

init_db()

class ClosetCueHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def translate_path(self, path):
        resolved = super().translate_path(path)
        # Serve custom test uploads from the same directory used by writes/deletes.
        if (os.path.dirname(resolved) == os.path.join(BASE_DIR, "uploads")
                and os.path.basename(resolved).startswith("garment_")):
            return os.path.join(UPLOADS_DIR, os.path.basename(resolved))
        return resolved

    def send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        if path == "/php/delete_garment.php":
            self.send_json({"status": "error", "message": "POST required to delete a garment."}, status=405)
            return

        if path in ("", "/"):
            self.path = "/index.html"
            return super().do_GET()

        # API: /php/get_analytics.php
        if path == "/php/get_analytics.php":
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()

            cur.execute("""
                SELECT g.*, COUNT(w.log_id) AS total_wears, MAX(w.worn_date) AS last_worn 
                FROM garments g 
                JOIN wear_history w ON g.id = w.garment_id 
                GROUP BY g.id 
                ORDER BY total_wears DESC 
                LIMIT 4
            """)
            most_loved = [dict(row) for row in cur.fetchall()]

            cur.execute("""
                SELECT g.*, COUNT(w.log_id) AS total_wears, MAX(w.worn_date) AS last_worn 
                FROM garments g 
                JOIN wear_history w ON g.id = w.garment_id 
                GROUP BY g.id 
                ORDER BY last_worn DESC 
                LIMIT 4
            """)
            recently_worn = [dict(row) for row in cur.fetchall()]
            conn.close()

            self.send_json({
                "status": "success",
                "most_loved": most_loved,
                "recently_worn": recently_worn
            })
            return

        # API: /php/filter_closet.php
        if path == "/php/filter_closet.php":
            occasion = params.get("occasion", [None])[0]
            category = params.get("category", [None])[0]
            color_family = params.get("color_family", [None])[0]
            fabric = params.get("fabric", [None])[0]
            sort = params.get("sort", ["newest"])[0]

            sql = """
                SELECT g.*, 
                       COUNT(w.log_id) AS wear_count, 
                       MAX(w.worn_date) AS last_worn 
                FROM garments g 
                LEFT JOIN wear_history w ON g.id = w.garment_id
            """
            conditions = []
            args = []

            if occasion:
                conditions.append("g.occasion = ?")
                args.append(occasion)
            if category:
                conditions.append("g.category = ?")
                args.append(category)
            if color_family:
                conditions.append("g.color_family = ?")
                args.append(color_family)
            if fabric:
                conditions.append("g.fabric = ?")
                args.append(fabric)

            if conditions:
                sql += " WHERE " + " AND ".join(conditions)

            sql += " GROUP BY g.id"

            if sort == "least_worn":
                sql += " ORDER BY (last_worn IS NOT NULL) ASC, last_worn ASC, wear_count ASC, g.id DESC"
            elif sort == "most_worn":
                sql += " ORDER BY wear_count DESC, g.id DESC"
            else:
                sql += " ORDER BY g.id DESC"

            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute(sql, args)
            garments = [dict(row) for row in cur.fetchall()]
            conn.close()

            self.send_json({
                "status": "success",
                "count": len(garments),
                "garments": garments
            })
            return

        # API: /php/item_engine.php
        if path == "/php/item_engine.php":
            try:
                item_id = int(params.get("id", [0])[0])
            except (ValueError, TypeError):
                item_id = 0
            if item_id <= 0:
                self.send_json({"status": "error", "message": "Invalid item ID"}, status=400)
                return

            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()

            cur.execute("""
                SELECT g.*, COUNT(w.log_id) AS times_worn, MAX(w.worn_date) AS last_worn 
                FROM garments g 
                LEFT JOIN wear_history w ON g.id = w.garment_id 
                WHERE g.id = ? 
                GROUP BY g.id
            """, (item_id,))
            row = cur.fetchone()
            if not row:
                conn.close()
                self.send_json({"status": "error", "message": "Garment not found"}, status=404)
                return

            item = dict(row)

            # Recommendations
            cat_map = {
                "Top": ["Bottom", "Footwear"],
                "Bottom": ["Top", "Footwear"],
                "One-Piece": ["Footwear"],
                "Footwear": ["Top", "Bottom", "One-Piece"]
            }
            target_cats = cat_map.get(item["category"], ["Top", "Bottom"])
            recommendations = []

            for t_cat in target_cats:
                cur.execute("""
                    SELECT * FROM garments 
                    WHERE category = ? 
                      AND occasion = ? 
                      AND (color_family = 'Neutral' OR color_family = ? OR ? = 'Neutral')
                      AND id != ?
                    LIMIT 3
                """, (t_cat, item["occasion"], item["color_family"], item["color_family"], item_id))
                for rec_row in cur.fetchall():
                    rec = dict(rec_row)
                    if rec["color_family"] == "Neutral":
                        color_exp = f"Neutral Match: {rec['color_name']} neutral balances {item['color_name']}."
                    elif item["color_family"] == "Neutral":
                        color_exp = f"Neutral Match: {item['color_name']} neutral pairs seamlessly with {rec['color_name']}."
                    elif rec["color_family"] == item["color_family"]:
                        color_exp = f"Harmonious {item['color_family']} Tones: {item['color_name']} pairs with {rec['color_name']}."
                    else:
                        color_exp = f"Color Pairing: {item['color_name']} complements {rec['color_name']}."

                    rec["match_reason"] = f"Occasion: {item['occasion']} wear • {color_exp}"
                    recommendations.append(rec)

            if not recommendations:
                for t_cat in target_cats:
                    cur.execute("""
                        SELECT * FROM garments 
                        WHERE category = ? 
                          AND (color_family = 'Neutral' OR color_family = ? OR ? = 'Neutral')
                          AND id != ?
                        LIMIT 2
                    """, (t_cat, item["color_family"], item["color_family"], item_id))
                    for rec_row in cur.fetchall():
                        rec = dict(rec_row)
                        rec["match_reason"] = f"Versatile Match: {rec['color_name']} {rec['category']} pairs with {item['color_name']}."
                        recommendations.append(rec)

            conn.close()

            self.send_json({
                "status": "success",
                "item": item,
                "recommendations": recommendations
            })
            return

        if path.endswith((".php", ".py", ".db", ".sql")):
            self.send_error(404)
            return
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        try:
            request_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            request_length = -1
        if request_length < 0 or request_length > 6 * 1024 * 1024:
            self.send_json({"status": "error", "message": "Request too large. Photos must be no larger than 5 MB."}, status=413)
            return

        # API: /php/delete_garment.php
        if path == "/php/delete_garment.php":
            if "application/x-www-form-urlencoded" not in self.headers.get("Content-Type", ""):
                self.send_json({"status": "error", "message": "Submit the garment ID as form data."}, status=415)
                return
            try:
                data = urllib.parse.parse_qs(self.rfile.read(request_length).decode("utf-8"))
                raw_id = data.get("garment_id", [""])[0]
                garment_id = int(raw_id) if re.fullmatch(r"[1-9][0-9]{0,9}", raw_id) else 0
            except (UnicodeDecodeError, ValueError):
                garment_id = 0
            if not 0 < garment_id <= 2147483647:
                self.send_json({"status": "error", "message": "Select a valid garment to delete."}, status=400)
                return

            conn = sqlite3.connect(DB_PATH)
            try:
                conn.execute("BEGIN IMMEDIATE")
                garment = conn.execute("SELECT image_path FROM garments WHERE id = ?", (garment_id,)).fetchone()
                if not garment:
                    conn.rollback()
                    self.send_json({"status": "error", "message": "This garment is no longer in your wardrobe."}, status=404)
                    return
                image_path = garment[0]
                # Explicit cleanup also works with existing SQLite files where FK enforcement is off.
                conn.execute("DELETE FROM wear_history WHERE garment_id = ?", (garment_id,))
                conn.execute("DELETE FROM garments WHERE id = ?", (garment_id,))
                shared_image = conn.execute("SELECT 1 FROM garments WHERE image_path = ? LIMIT 1", (image_path,)).fetchone()
                conn.commit()
            except sqlite3.Error:
                conn.rollback()
                self.send_json({"status": "error", "message": "Could not delete this garment. Please try again."}, status=500)
                return
            finally:
                conn.close()

            # Keep bundled sample images and any image another garment still uses.
            filename = os.path.basename(image_path)
            photo = os.path.realpath(os.path.join(UPLOADS_DIR, filename))
            if (not shared_image and image_path == "uploads/" + filename
                    and filename.startswith("garment_")
                    and os.path.dirname(photo) == os.path.realpath(UPLOADS_DIR)):
                try:
                    os.remove(photo)
                except FileNotFoundError:
                    pass
                except OSError:
                    self.log_error("Garment deleted; its unused photo could not be removed.")
            self.send_json({"status": "success", "message": "Garment and wear history deleted."})
            return

        # API: /php/log_wear.php
        if path == "/php/log_wear.php":
            content_type = self.headers.get("Content-Type", "")
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)

            post_data = {}
            if "multipart/form-data" in content_type:
                # Parse multipart
                import email
                msg = email.message_from_bytes(b"Content-Type: " + content_type.encode() + b"\r\n\r\n" + body)
                for part in msg.walk():
                    if part.get_content_disposition() == "form-data":
                        name = part.get_param("name", header="content-disposition")
                        post_data[name] = part.get_payload(decode=True).decode("utf-8", errors="ignore")
            else:
                parsed_body = urllib.parse.parse_qs(body.decode("utf-8"))
                for k, v in parsed_body.items():
                    post_data[k] = v[0]

            try:
                garment_id = int(post_data.get("garment_id", 0))
            except (ValueError, TypeError):
                garment_id = 0
            event_note = post_data.get("event_note", "Daily Wear").strip() or "Daily Wear"

            if len(event_note) > 100:
                self.send_json({"status": "error", "message": "Event note must be 100 characters or fewer."}, status=400)
                return

            if garment_id <= 0:
                self.send_json({"status": "error", "message": "Invalid garment ID"}, status=400)
                return

            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            cur.execute("SELECT garment_name, shelf_location FROM garments WHERE id = ?", (garment_id,))
            garment = cur.fetchone()
            if not garment:
                conn.close()
                self.send_json({"status": "error", "message": "Garment not found"}, status=404)
                return

            g_name, g_shelf = garment
            today_str = local_today().isoformat()
            cur.execute("INSERT INTO wear_history (garment_id, worn_date, event_note) VALUES (?, ?, ?)", (garment_id, today_str, event_note))
            conn.commit()

            cur.execute("SELECT COUNT(*), MAX(worn_date) FROM wear_history WHERE garment_id = ?", (garment_id,))
            wears, last_w = cur.fetchone()
            conn.close()

            display_date = local_today().strftime("%d %b %Y")
            self.send_json({
                "status": "success",
                "message": f"Outfit logged! Marked {g_name} as worn today ({display_date}). Grab it from: {g_shelf}!",
                "shelf_location": g_shelf,
                "total_wears": wears,
                "last_worn": last_w
            })
            return

        # API: /php/upload_garment.php
        if path == "/php/upload_garment.php":
            content_type = self.headers.get("Content-Type", "")
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)

            post_data = {}
            photo = None
            photo_extension = None

            if "multipart/form-data" in content_type:
                import email
                msg = email.message_from_bytes(b"Content-Type: " + content_type.encode() + b"\r\n\r\n" + body)
                for part in msg.walk():
                    if part.get_content_disposition() == "form-data":
                        name = part.get_param("name", header="content-disposition")
                        filename = part.get_param("filename", header="content-disposition")
                        payload = part.get_payload(decode=True)
                        if filename and payload and name == "garment_photo":
                            photo = payload
                            if payload.startswith(b"\xff\xd8\xff"):
                                photo_extension = "jpg"
                            elif payload.startswith(b"\x89PNG\r\n\x1a\n"):
                                photo_extension = "png"
                            elif payload.startswith(b"RIFF") and payload[8:12] == b"WEBP":
                                photo_extension = "webp"
                        elif name and payload:
                            post_data[name] = payload.decode("utf-8", errors="ignore")

            garment_name = post_data.get("garment_name", "").strip()
            category = post_data.get("category", "").strip()
            fabric = post_data.get("fabric", "").strip()
            color_name = post_data.get("color_name", "").strip()
            color_family = post_data.get("color_family", "").strip()
            occasion = post_data.get("occasion", "").strip()
            shelf_location = post_data.get("shelf_location", "").strip()

            fields = {"Garment name": (garment_name, 100), "Category": (category, 30),
                      "Fabric": (fabric, 50), "Color name": (color_name, 50),
                      "Color family": (color_family, 20), "Occasion": (occasion, 50),
                      "Physical shelf location": (shelf_location, 100)}
            errors = [f"{label} is required and must be {limit} characters or fewer."
                      for label, (value, limit) in fields.items() if not value or len(value) > limit]
            if category not in ("Top", "Bottom", "One-Piece", "Footwear"):
                errors.append("Select a valid category.")
            if color_family not in ("Neutral", "Warm", "Cool"):
                errors.append("Select a valid color family.")
            if not photo or not photo_extension:
                errors.append("A valid JPG, PNG, or WebP garment photo is required.")
            elif len(photo) > 5 * 1024 * 1024:
                errors.append("Photo must be no larger than 5 MB.")
            if errors:
                self.send_json({"status": "error", "message": " ".join(errors)}, status=400)
                return

            saved_filename = f"garment_{uuid.uuid4().hex}.{photo_extension}"
            with open(os.path.join(UPLOADS_DIR, saved_filename), "wb") as image_file:
                image_file.write(photo)
            image_path = f"uploads/{saved_filename}"
            alt_text = f"{color_name} {fabric} {category} for {occasion} wear, stored at {shelf_location}"

            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO garments (garment_name, category, color_family, color_name, fabric, occasion, shelf_location, image_path, alt_text)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (garment_name, category, color_family, color_name, fabric, occasion, shelf_location, image_path, alt_text))
            conn.commit()
            new_id = cur.lastrowid
            conn.close()

            self.send_json({
                "status": "success",
                "message": f"{garment_name} was successfully added to your closet!",
                "garment_id": new_id,
                "redirect": "closet.html"
            })
            return

        self.send_json({"status": "error", "message": "Not found"}, status=404)

if __name__ == "__main__":
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), ClosetCueHandler) as httpd:
        print(f"ClosetCue Server running live at: http://localhost:{PORT}/")
        print("Press Ctrl+C to terminate.")
        httpd.serve_forever()
