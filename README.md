# ClosetCue — Smart Wardrobe & Wear Log (Retro Desktop Edition)

> **Course:** FLEXICORE-3131 — Web Technology  
> **Degree:** V Semester B.Tech (Academic Year 2026–2027)  
> **Department:** School of Computer Engineering, Manipal Institute of Technology (MIT), Manipal  
> **Faculty Guide:** Ms. Swathi B.P  
> **Project Report:** [`Muhir_Kapoor_240953576_Aanya_Verma_240911400_WT_ProjectReport_ICT3131.docx`](./Muhir_Kapoor_240953576_Aanya_Verma_240911400_WT_ProjectReport_ICT3131.docx)

---

## 👥 Student Team & Project Work Split

This project was engineered collaboratively as a two-person team. The application is divided cleanly into distinct frontend pages and backend API endpoints to demonstrate individual mastery of full-stack web engineering principles:

| Metric / Detail | Student 1 (Lead / In-Charge) | Student 2 (Co-Developer) |
| :--- | :--- | :--- |
| **Student Name** | **Muhir Kapoor** | **Aanya Verma** |
| **Registration Number** | `240953576` | `240911400` |
| **Degree & Branch** | B.Tech in Computer & Communication Engineering | B.Tech in Information Technology |
| **Assigned Modules** | **Module 1:** Home Analytics Dashboard<br>**Module 2:** Garment Ingestion & Uploads | **Module 3:** Interactive Wardrobe Catalogue<br>**Module 4:** Item Details & Outfit Recommender |
| **Frontend Pages** | • `index.html` (Dashboard & Analytics)<br>• `add-garment.html` (Garment Form & Preview) | • `closet.html` (Wardrobe Catalogue & Filters)<br>• `item-details.html` (Details, Wear Log & Deletion) |
| **JavaScript Controllers** | • `js/analytics.js`<br>• `js/upload.js` | • `js/closet.js`<br>• `js/item-details.js` |
| **Backend Endpoints (PHP)** | • `php/get_analytics.php`<br>• `php/upload_garment.php` | • `php/filter_closet.php`<br>• `php/item_engine.php`<br>• `php/log_wear.php`<br>• `php/delete_garment.php` |
| **Shared Core Modules** | • `js/common.js` (Sanitized rendering, API Fetch wrapper, notifications)<br>• `css/style.css` (Retro desktop design tokens, window frames, responsive bevels)<br>• `server.py` (Zero-dependency local demonstration backend mirroring PHP APIs)<br>• `sql/closetcue_db.sql` (Relational MySQL schema with seed data) |

---

## 📌 Project Overview & Problem Statement

Modern wardrobes suffer from a visibility problem: physical garments are frequently stacked or obscured, leading to forgotten items, repetitive wearing of the same pieces, and unnecessary textile waste. 

**ClosetCue** is a retro-styled personal smart wardrobe manager that:
1. **Catalogues Physical Placement:** Maps clothing items directly to precise shelf/rack locations (e.g., *Shelf A – Top Row*, *Shoe Rack – Slot 1*) for instant physical retrieval.
2. **Tracks Wear History & Utilization:** Logs every wear event with timestamps and occasion notes, generating real-time analytics on rotation percentages, most-worn pieces, and unworn items.
3. **Recommends Rule-Based Outfits:** Employs an algorithmic outfit recommendation engine based on sartorial pairing rules and color theory rather than opaque machine learning.
4. **Ensures Total Accessibility (WCAG 2.1 A/AA):** Features keyboard-navigable dialogs, high-contrast retro aesthetics, screen-reader landmarks, and captioned media tutorials.

---

## 🏗️ System Architecture & Technology Stack

The project features a **dual-backend architecture**, allowing flexible academic evaluation across both standard LAMP environments and zero-dependency local environments:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Client Tier (Browser)                             │
│  Semantic HTML5  •  Bootstrap 5.3  •  Custom Retro CSS  •  Vanilla JS  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Asynchronous JSON (Fetch API)
                                   ▼
          ┌─────────────────────────────────────────────────┐
          │            Application / Server Tier            │
          ├────────────────────────┬────────────────────────┤
          │   Academic Stack       │  Standalone Demo Stack │
          │   PHP 8.3 + Apache     │  Python 3.10+ (server) │
          │   (Prepared MySQLi)    │  (Built-in SQLite)     │
          └───────────┬────────────┴───────────┬────────────┘
                      │                        │
                      ▼                        ▼
          ┌──────────────────────┐  ┌───────────────────────┐
          │    MySQL 8.4 DB      │  │      closetcue.db     │
          │ (closetcue_retro_db) │  │   (Local SQLite file) │
          └──────────────────────┘  └───────────────────────┘
```

- **Frontend:** Semantic HTML5, Bootstrap 5.3 (bundled locally), Custom CSS3 design tokens (retro window borders, beveled buttons, responsive grid), Vanilla JavaScript ES6+ (Fetch API, DOM manipulation, AbortController for race-free filtering).
- **Backend A (Curriculum Production):** PHP 8.3 with Apache, `mysqli` prepared statements with parameterized inputs, and strict input/MIME validation.
- **Backend B (Portable Demonstration):** Python 3.10+ zero-dependency HTTP server (`server.py`) using standard library modules and SQLite (`closetcue.db`), providing identical endpoint contracts for instant peer review.
- **Data Persistence:** Relational schema enforcing referential integrity with cascading deletes.
- **Self-Contained Assets:** Offline typography (Host Grotesk, IBM Plex Sans, IBM Plex Mono in `.woff2`), SVG icon sprite, instructional video (`wardrobe-guide.mp4`), WebVTT captions, and seeded garment imagery.

---

## 📊 Relational Database Design

The data layer models personal wardrobe tracking through two core entities with a one-to-many relationship:

```
┌─────────────────────────────────────────┐
│                garments                 │
├─────────────────────────────────────────┤
│ PK  id             INT AUTO_INCREMENT   │
│     garment_name   VARCHAR(100)         │
│     category       ENUM(...)            │
│     color_family   ENUM(...)            │
│     color_name     VARCHAR(50)          │
│     fabric         VARCHAR(50)          │
│     occasion       VARCHAR(50)          │
│     shelf_location VARCHAR(100)         │
│     image_path     VARCHAR(255)         │
│     alt_text       VARCHAR(255)         │
│     created_at     TIMESTAMP            │
└────────────────────┬────────────────────┘
                     │ 1
                     │
                     │ has many
                     │ (ON DELETE CASCADE)
                     │ M
┌────────────────────▼────────────────────┐
│              wear_history               │
├─────────────────────────────────────────┤
│ PK  log_id         INT AUTO_INCREMENT   │
│ FK  garment_id     INT                  │
│     worn_date      DATE                 │
│     event_note     VARCHAR(100)         │
└─────────────────────────────────────────┘
```

### Referential Integrity & Safety Guarantees
- **Cascading Deletes:** Deleting a garment automatically cascades and purges its corresponding records from `wear_history`.
- **Photo Cleanup Protocol:** Dynamic uploads (`uploads/garment_*`) are unlinked from the server disk upon confirmed deletion if no other item shares the file. Bundled sample photos are permanently preserved.
- **ACID Transactions:** Wear logging and deletions are wrapped in transactional blocks (`BEGIN IMMEDIATE` / `COMMIT`) with automatic rollback on error.

---

## 🔌 API Specification & Route Contracts

All client-server communication uses standard HTTP verbs returning JSON payloads with appropriate HTTP status codes and `Cache-Control: no-store`:

| HTTP Method | Endpoint | Developer | Parameters / Body | Description & Response Codes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/php/get_analytics.php` | **Muhir** | None | Aggregates total items, wear logs, unworn count, rotation percentage, Most Loved, and Recently Worn. *(200, 500)* |
| `POST` | `/php/upload_garment.php` | **Muhir** | `multipart/form-data`: name, category, color family, color, fabric, occasion, shelf, photo file | Validates MIME type, dimensions, and string limits; saves photo to `uploads/garment_*`; inserts garment. *(200, 400, 413, 415, 500)* |
| `GET` | `/php/filter_closet.php` | **Aanya** | Query parameters: `occasion`, `category`, `color_family`, `fabric`, `sort` | Dynamic filtering with parameterized queries. Sorts by newest, most worn, or least recently worn. *(200, 500)* |
| `GET` | `/php/item_engine.php` | **Aanya** | Query parameter: `garment_id` | Retrieves garment metadata, wear history, and runs the rule-based outfit recommendation engine. *(200, 400, 404, 500)* |
| `POST` | `/php/log_wear.php` | **Aanya** | `garment_id`, `worn_date`, optional `event_note` | Logs a new wear event in `wear_history`. Updates totals dynamically. *(200, 400, 404, 500)* |
| `POST` | `/php/delete_garment.php` | **Aanya** | `garment_id` | Atomically deletes garment, purges wear logs, and unlinks custom photo. *(200, 400, 404, 405, 500)* |

---

## 🧩 Detailed Module Breakdown & Student Contributions

### 1. Student 1: Muhir Kapoor (`240953576`)
#### Module 1: Home Dashboard (`index.html` & `js/analytics.js`)
- **Metric Aggregation:** Real-time computation of total garments, total wears, unworn gems, and wardrobe rotation efficiency rate.
- **Ranked Visualizations:**
  - *Most Loved Items:* Garments ranked by highest historical wear count.
  - *Recently Worn Items:* Garments sorted chronologically by the latest wear log date.
- **Accessible Instructional Video:** Embedded HTML5 tutorial video (`media/wardrobe-guide.mp4`) accompanied by synchronized WebVTT subtitles (`media/captions.vtt`) and an expandable plain-text transcript disclosure widget for screen readers.

#### Module 2: Add Garment (`add-garment.html` & `js/upload.js`)
- **Real-Time Client Preview:** Instant photo thumbnail rendering via FileReader API upon selection, before upload.
- **Two-Tier Form Validation:** Accessible client-side constraint validation linked with server-side MIME type verification (`finfo`), image dimension validation (`getimagesize`), and strict 5 MB payload limits.
- **Dynamic Accessible Metadata:** Automatically generates screen-reader alt text (e.g., *"Ivory White Linen Bottom for Summery wear, stored at Shelf B – Bottom Row"*).

---

### 2. Student 2: Aanya Verma (`240911400`)
#### Module 3: My Closet Catalogue (`closet.html` & `js/closet.js`)
- **Multi-Faceted Dynamic Filtering:** Real-time filtering across Occasion, Category, Color Family, and Fabric using parameterized queries.
- **Sorting Logic:** Options for *Newest First*, *Most Worn*, and *Least Recently Worn* (prioritizing completely unworn items first to combat wardrobe neglect).
- **Shareable Filter State:** URL query parameter synchronization (`history.replaceState`) allowing specific wardrobe views to be bookmarked and shared.
- **Race-Condition Prevention:** Implemented `AbortController` in Fetch requests to cancel in-flight queries during rapid filter adjustments.

#### Module 4: Item Details & Recommendation Engine (`item-details.html` & `js/item-details.js`)
- **Physical Shelf Locator:** Prominent visual badge indicating physical storage location for friction-free retrieval.
- **Persistent Wear Logging:** Interactive form logging wear dates and event notes (e.g., "Diwali Prep", "College Fest") with immediate counter increments.
- **Rule-Based Outfit Recommender ("Complete the Look"):**
  - **Category Complementarity:** Suggests Tops/Footwear for Bottoms, Bottoms/Footwear for Tops, and Outerwear/Footwear for One-Pieces.
  - **Occasion Alignment:** Requires identical occasion context.
  - **Color Harmony Rules:** Neutrals match all color families; Warm pairs with Warm/Neutral; Cool pairs with Cool/Neutral.
  - **Fallback Logic:** If strict criteria yield no matches, falls back to *Versatile Matches* relaxing the occasion constraint.
- **Confirmed Deletion Flow:** Modal dialog requiring explicit confirmation, keyboard accessible (Esc/Enter traps), ensuring safe item removal.

---

## 🚀 Execution & Setup Instructions

### Option A: Portable Demo Server (Python 3.10+ / SQLite) — *Fastest for Evaluation*
Requires **zero external dependencies** and works out of the box on Windows, macOS, and Linux:

```powershell
# From the project root directory
py -3 server.py
# (or 'python server.py' depending on your PATH)
```
Open **`http://localhost:8001`** in any modern web browser.

> [!NOTE]
> • Runs on port `8001` by default (configurable via `PORT` environment variable).  
> • Operates against the local `closetcue.db` SQLite database, pre-seeded with 10 sample garments and 18 historical wear events.  
> • No Node.js runtime or build pipeline is required to run the demo.

---

### Option B: Curriculum Production Stack (XAMPP with PHP 8 + MySQL)
To run within a traditional Apache/PHP/MySQL environment:

1. **Copy Project Directory:**
   Copy the `project_2nd_try` folder to your XAMPP web root:
   ```
   C:\xampp\htdocs\project_2nd_try
   ```
2. **Import MySQL Schema:**
   - Launch XAMPP Control Panel and start **Apache** and **MySQL**.
   - Navigate to `http://localhost/phpmyadmin/`.
   - Import [`sql/closetcue_db.sql`](./sql/closetcue_db.sql). This creates the database **`closetcue_retro_db`** pre-populated with tables and seed records.
3. **Configure PHP Extensions:**
   In `C:\xampp\php\php.ini`, ensure the following directives are enabled:
   ```ini
   extension=mysqli
   extension=fileinfo
   upload_max_filesize = 5M
   post_max_size = 6M
   ```
   Restart Apache to apply configuration changes.
4. **Access Application:**
   Open **`http://localhost/project_2nd_try/`** in your browser.

> [!TIP]
> Database connection defaults are defined in [`php/db_connect.php`](./php/db_connect.php) (`localhost`, user: `root`, empty password). Override these via environment variables if needed (`CLOSETCUE_DB_HOST`, `CLOSETCUE_DB_USER`, `CLOSETCUE_DB_PASSWORD`, `CLOSETCUE_DB_NAME`).

---

## 🧪 Comprehensive Quality Assurance & Verification

The project includes automated end-to-end (E2E) testing, WCAG accessibility auditing, and containerized PHP validation:

### 1. Browser E2E & Accessibility Suite
Audits all four user journeys across multiple viewports (1440px, 1024px, 760px, 390px, 320px) and runs `@axe-core/playwright` accessibility audits:

```powershell
# Set up test dependencies in a disposable temp directory
$qa = Join-Path $env:TEMP 'closetcue-retro-qa'
npm.cmd install --prefix $qa playwright @axe-core/playwright --no-audit --no-fund
$env:NODE_PATH = Join-Path $qa 'node_modules'

# Run browser workflows and accessibility audits
node tests/browser.cjs

# Run deletion, keyboard focus, and file-unlinking validation
node tests/deletion.cjs
```

### 2. Containerized PHP / MySQL Strict-Mode Suite
Exercises the real Apache/PHP 8.3 container and strict MySQL 8.4 engine in Docker:

```powershell
# With Docker Desktop running:
node tests/php/run.cjs
```
This tests prepared statements, UTF-8 Unicode characters, MIME type sniffing, 5 MB payload boundary limits, transactional rollbacks, and recovery under simulated server restarts.

---

## 📁 Repository File Structure

```text
ClosetCue/
├── .gitignore                   # Ignores bytecode, logs, test diffs, runtime uploads & Word lock files
├── README.md                    # Comprehensive academic project documentation
├── Muhir_Kapoor_...docx         # Formal course project report (FLEXICORE-3131)
│
├── index.html                   # [Student 1] Home analytics dashboard
├── add-garment.html             # [Student 1] Garment addition form with file preview
├── closet.html                  # [Student 2] Wardrobe catalogue with multi-filter & sorting
├── item-details.html            # [Student 2] Item view, wear logger, recommendations & deletion
│
├── css/
│   └── style.css                # Custom retro desktop styles, bevel tokens & responsive layout
├── js/
│   ├── analytics.js             # [Student 1] Dashboard metric fetching & card rendering
│   ├── upload.js                # [Student 1] Form submission & live thumbnail preview
│   ├── closet.js                # [Student 2] Dynamic filtering, sorting & URL state sync
│   ├── item-details.js          # [Student 2] Wear logging, recommendation loading & modal controls
│   └── common.js                # Shared DOM helpers, XSS sanitization & API Fetch wrapper
│
├── php/
│   ├── db_connect.php           # MySQL connection setup with environment variable overrides
│   ├── api.php                  # Shared helper for JSON headers, error handling & input sanitization
│   ├── get_analytics.php        # [Student 1] Dashboard metrics aggregation API
│   ├── upload_garment.php       # [Student 1] Multipart file validation & garment insertion API
│   ├── filter_closet.php        # [Student 2] Parameterized catalogue filter and sorting API
│   ├── item_engine.php          # [Student 2] Item details and rule-based outfit matcher API
│   ├── log_wear.php             # [Student 2] Wear history logging API
│   └── delete_garment.php       # [Student 2] Transactional deletion & photo cleanup API
│
├── sql/
│   └── closetcue_db.sql         # Relational schema and 10-garment / 18-wear-log seed data
├── closetcue.db                 # Standalone SQLite database for zero-dependency Python demo
├── server.py                    # Standalone Python demonstration HTTP server (Port 8001)
│
├── assets/
│   ├── bootstrap.min.css        # Bundled Bootstrap 5.3 framework
│   ├── icons.svg                # Original UI SVG icon sprite
│   ├── favicon.svg              # ClosetCue retro desktop favicon
│   ├── CREDITS.md               # Attributions for sample clothing photos and typography
│   └── fonts/                   # Locally bundled WOFF2 font files (Host Grotesk, IBM Plex)
├── media/
│   ├── wardrobe-guide.mp4       # 28-second silent instructional guide video
│   ├── captions.vtt             # WebVTT subtitle track for video guide
│   └── guide-poster.jpg         # Video poster frame
├── uploads/
│   ├── .gitkeep                 # Preserves uploads directory in git
│   └── *.jpg                    # Bundled sample garment photos for seed items
│
├── tests/                       # Automated E2E, accessibility, and deletion test suites
└── tools/                       # Build scripts for asset optimization and guide recording
```

---

## 📋 Evaluation Checklist for Examiners

| Requirement / Criterion | Implementation Status | Evidence / File Reference |
| :--- | :---: | :--- |
| **Relational Database Design** | ✅ Implemented | Two tables with foreign keys and cascading deletion in [`sql/closetcue_db.sql`](./sql/closetcue_db.sql). |
| **CRUD Operations** | ✅ Implemented | **Create:** `upload_garment.php`<br>**Read:** `get_analytics.php`, `filter_closet.php`<br>**Update / Log:** `log_wear.php`<br>**Delete:** `delete_garment.php` |
| **Asynchronous Web Communication** | ✅ Implemented | Vanilla `fetch()` requests with JSON payloads and `AbortController` in [`js/`](./js/). |
| **Security & Input Sanitization** | ✅ Implemented | Prepared statements for SQL injection defense; MIME sniffing with `finfo`; HTML entity escaping in card renderer. |
| **Responsive Web Design** | ✅ Implemented | Custom CSS Grid and Flexbox layouts tested across 320px–1440px viewports in [`css/style.css`](./css/style.css). |
| **Web Accessibility (WCAG 2.1 A/AA)** | ✅ Implemented | Skip-to-content links, visible keyboard focus indicators, screen-reader alt text, video subtitles (`.vtt`), and transcript disclosure. |
| **Dual Backend Support** | ✅ Implemented | Standard PHP 8 / MySQL stack for academic evaluation + zero-dependency Python 3 / SQLite server for quick testing. |

---

*Submitted in partial fulfillment of the requirements for FLEXICORE-3131 (Web Technology), Department of Computer Science & Engineering, Manipal Institute of Technology, Manipal.*
