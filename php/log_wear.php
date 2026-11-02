<?php
require_once __DIR__ . '/api.php';
api_method('POST', ['application/x-www-form-urlencoded', 'multipart/form-data']);
$garment_id = api_id($_POST, 'garment_id');
$event_note = api_text($_POST, 'event_note') ?: 'Daily Wear';
if (api_length($event_note) > 100) api_error(400, 'Event note must be 100 characters or fewer.');
require_once __DIR__ . '/db_connect.php';

try {
    // Serialize wear logging and deletion for the same garment.
    $conn->begin_transaction();
    $stmt = $conn->prepare('SELECT garment_name, shelf_location FROM garments WHERE id = ? FOR UPDATE');
    $stmt->bind_param('i', $garment_id);
    $stmt->execute();
    $garment = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$garment) {
        $conn->rollback();
        api_error(404, 'Garment not found in your wardrobe.');
    }
    $stmt = $conn->prepare('INSERT INTO wear_history (garment_id, worn_date, event_note) VALUES (?, CURDATE(), ?)');
    $stmt->bind_param('is', $garment_id, $event_note);
    $stmt->execute();
    $stmt->close();
    $stmt = $conn->prepare('SELECT COUNT(*) AS total_wears, MAX(worn_date) AS last_worn FROM wear_history WHERE garment_id = ?');
    $stmt->bind_param('i', $garment_id);
    $stmt->execute();
    $stats = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $conn->commit();
} catch (Throwable $error) {
    $conn->rollback();
    throw $error;
}
api_json([
    'status' => 'success',
    'message' => "Outfit logged! Marked {$garment['garment_name']} as worn today (" . date('d M Y') . "). Grab it from: {$garment['shelf_location']}!",
    'shelf_location' => $garment['shelf_location'],
    'total_wears' => (int)$stats['total_wears'],
    'last_worn' => $stats['last_worn']
]);
