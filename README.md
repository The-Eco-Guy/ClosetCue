# ClosetCue — Retro edition

A separate version of the original ClosetCue project, styled as a retro desktop. The original `project` directory is not modified. This version keeps HTML5, Bootstrap 5.3, vanilla JavaScript, the four original page routes, and the PHP/MySQL API. A dependency-free Python/SQLite demo server provides the same endpoints for local use.

## Run locally

From this directory on Windows:

```powershell
py -3.14 server.py
```

Open **http://localhost:8001**. On systems with Python on PATH, `python server.py` also works (Python 3.10+). No Node install or build is needed to run the app. Fonts, Bootstrap, images, and tutorial media are stored locally.

The demo uses this folder's `closetcue.db`; it does not share the original project's SQLite file. The copied wardrobe and wear history are preserved. Port 8001 lets both projects run side by side. Set the `PORT` environment variable to choose another port. The demo server listens only on the local computer.

## Run with XAMPP (PHP 8 + MySQL)

1. Copy this folder to `C:\xampp\htdocs\project_2nd_try`.
2. Start Apache and MySQL.
3. Import `sql/closetcue_db.sql` in phpMyAdmin. It creates **`closetcue_retro_db`**, separate from the original `closetcue_db`.
4. In `C:\xampp\php\php.ini`, ensure `mysqli` and `fileinfo` are enabled, set `upload_max_filesize = 5M` and `post_max_size = 6M`, then restart Apache. The uploads folder must be writable by Apache.
5. Open `http://localhost/project_2nd_try/`.

Connection defaults are in `php/db_connect.php` (localhost, root, empty password for local XAMPP). You can override them with `CLOSETCUE_DB_HOST`, `CLOSETCUE_DB_PORT`, `CLOSETCUE_DB_USER`, `CLOSETCUE_DB_PASSWORD`, and `CLOSETCUE_DB_NAME` environment variables in the PHP/Apache process. PHP needs the mysqli driver with mysqlnd (included in the tested PHP image and standard XAMPP). The SQLite demo and MySQL mode are independent databases; changes are not synchronized. MySQL import contains the original 10 garments and 18 sample wear entries. PHP and Python both log the current date in Asia/Kolkata.

## Pages and flows

| Page | Features |
| --- | --- |
| `index.html` | Live wardrobe totals, Most Loved, Recently Worn, captioned organization video and transcript |
| `closet.html` | Occasion, category, color and fabric filters; newest, least recently worn and most worn sorting; shareable filter URLs; empty/error states |
| `add-garment.html` | Required metadata, accessible validation, photo preview, JPG/PNG/WebP uploads up to 5 MB, generated alt text |
| `item-details.html?id=1` | Garment details, shelf location, persistent wear logging, matching pieces, and confirmed garment deletion |

The PHP endpoints remain under `php/`: `get_analytics.php`, `filter_closet.php`, `upload_garment.php`, `item_engine.php`, `log_wear.php`, and `delete_garment.php`. All database writes use prepared statements. Failed requests show an error and do not simulate a saved wear log.

To remove a piece, open it from My Closet, select **Delete garment**, then confirm. Deletion removes the garment and its wear history together. Unshared uploaded photos are cleaned up; bundled sample photos are retained. Cancel or press Escape to keep the item. An emptied wardrobe remains empty after restarting the server or database.

## Design and maintenance

- `css/style.css`: retro tokens, bevels, responsive layouts, visible focus and reduced-motion handling.
- `js/common.js`: safe card rendering, date formatting, shared API/error handling.
- `js/analytics.js`, `js/closet.js`, `js/upload.js`, `js/item-details.js`: page behavior.
- `tools/build-pages.cjs`: shared HTML templates. Run `node tools/build-pages.cjs` after changing them. The generated HTML can also be served directly.
- `tools/download-assets.cjs`: optional asset refresh. Runtime does not need internet access.
- `tools/build-guide.py` and `tools/record-guide.cjs`: rebuild the original 28-second silent instructional video. The first script draws slides with Pillow; the second records them with Playwright and Chrome while the demo server is running. Captions and the transcript describe all six slides.
- `assets/CREDITS.md`: sources for sample product photographs and fonts. Sample photos illustrate seeded garments; upload your own photos for your wardrobe.

## Verification

`tests/browser.cjs` checks all four pages at 1440, 1024, 760, 390 and 320 px, scans for WCAG A/AA issues with axe, and exercises filters, empty states, keyboard skip navigation, uploads, validation, recommendations, wear persistence, failed requests, captions, and transcript disclosure. It starts a separate server on port 18081 with a disposable test database. Test uploads are isolated in the OS temporary directory.

To install test tools outside the project and run the suite on Windows:

```powershell
$qa = Join-Path $env:TEMP 'closetcue-retro-qa'
npm.cmd install --prefix $qa playwright @axe-core/playwright --no-audit --no-fund
$env:NODE_PATH = Join-Path $qa 'node_modules'
node tests/browser.cjs
node tests/deletion.cjs
```

The deletion suite uses its own disposable database and uploads on port 18082. It checks confirmation and cancellation, keyboard access, failed requests, wear-history cleanup, shared photo handling, and an empty wardrobe surviving a restart.

Tests use installed Chrome by default. Set `CHROME` to another Chromium executable if needed. Screenshots and results are written to `qa/`. Automated accessibility checks are useful evidence, not a certification of complete WCAG compliance. The PHP suite runs a real Apache/PHP 8.3 server and MySQL 8.4 with strict SQL mode, under the same `/project_2nd_try/` URL prefix used by XAMPP. It does not use the Python API emulator.

With Docker Desktop running and the test dependencies above installed:

```powershell
node tests/php/run.cjs
```

This builds the PHP image with mysqli, imports the SQL seed, runs all browser/layout/accessibility and deletion checks against PHP, and exercises all six API endpoints. Additional checks cover malformed input, HTTP status codes, prepared query parameters, Unicode, JPEG/PNG/WebP, upload size boundaries, concurrent wear logging, transaction rollback, failed photo writes, database outage/recovery, and an empty wardrobe surviving a MySQL restart. Reports and screenshots go to `qa/php/`; `runtime-report.json` records the actual runtime versions and suite result.

The runner uses only the dedicated `closetcue-php-qa` Docker project, loopback port 18083, and disposable database/photo volumes. The source mount is read-only. Its fixtures never reset your local SQLite or XAMPP database. It removes its containers and volumes when finished. Run suites sequentially on machines with limited memory; the runner already does this for PHP.

The PHP API returns JSON with appropriate 400/404/405/413/415/500/503 statuses and disables caching. Failed database writes do not report success. Uploads use MIME-derived extensions and character-aware validation; failed inserts clean up the uploaded image. Server-side diagnostics stay in the PHP/Apache logs. Automated scans cover the tested Chrome flows; they do not certify every browser or manual assistive-technology interaction.

## Course modules

FLEXICORE-3131, Web Technology, V Sem B.Tech, MIT Manipal.

- Muhir Kapoor: Home dashboard and Add Garment.
- Aanya Verma: My Closet and Item Details / Complete the Look.
