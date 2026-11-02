<?php
// Shared JSON contract for PHP 8. Keep diagnostics in server logs, not responses.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
ini_set('display_errors', '0');
date_default_timezone_set('Asia/Kolkata');

function api_json($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function api_error($code, $message) {
    api_json(['status' => 'error', 'message' => $message], $code);
}

set_exception_handler(function (Throwable $error) {
    error_log((string)$error);
    api_error(500, 'The wardrobe request could not be completed. Please try again.');
});

function api_method($method, $content_type = null) {
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        header('Allow: ' . $method);
        api_error(405, $method . ' required for this request.');
    }
    if ($content_type !== null && !in_array(strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])), (array)$content_type, true)) {
        api_error(415, 'Unsupported request format. Please use the wardrobe form.');
    }
}

function api_text($input, $key, $default = '') {
    $value = $input[$key] ?? $default;
    if (!is_string($value) || preg_match('//u', $value) !== 1) {
        api_error(400, 'Invalid text value for ' . $key . '.');
    }
    return trim($value);
}

function api_length($text) {
    return preg_match_all('/./us', $text);
}

function api_id($input, $key) {
    $value = $input[$key] ?? '';
    if (!is_string($value) || !preg_match('/^[1-9][0-9]{0,9}$/D', $value) || (int)$value > 2147483647) {
        api_error(400, 'Select a valid garment.');
    }
    return (int)$value;
}
