<?php
require_once __DIR__ . '/api.php';
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
try {
    $conn = mysqli_init();
    $conn->options(MYSQLI_OPT_CONNECT_TIMEOUT, 3);
    $conn->real_connect(
        getenv('CLOSETCUE_DB_HOST') ?: 'localhost',
        getenv('CLOSETCUE_DB_USER') ?: 'root',
        getenv('CLOSETCUE_DB_PASSWORD') ?: '',
        getenv('CLOSETCUE_DB_NAME') ?: 'closetcue_retro_db',
        (int)(getenv('CLOSETCUE_DB_PORT') ?: 3306)
    );
    $conn->set_charset('utf8mb4');
    $conn->query("SET time_zone = '+05:30'");
} catch (mysqli_sql_exception $error) {
    error_log('ClosetCue database connection failed: ' . $error->getMessage());
    api_error(503, 'The wardrobe database is unavailable. Start MySQL and check the connection settings.');
}
