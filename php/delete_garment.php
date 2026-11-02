<?php
require_once __DIR__ . '/api.php';
api_method('POST', 'application/x-www-form-urlencoded');
$garment_id = api_id($_POST, 'garment_id');
require_once __DIR__ . '/db_connect.php';

try {
    $conn->begin_transaction();
    $stmt = $conn->prepare('SELECT image_path FROM garments WHERE id = ? FOR UPDATE');
    $stmt->bind_param('i', $garment_id);
    $stmt->execute();
    $garment = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$garment) {
        $conn->rollback();
        api_error(404, 'This garment is no longer in your wardrobe.');
    }
    $image_path = $garment['image_path'];
    $stmt = $conn->prepare('DELETE FROM wear_history WHERE garment_id = ?');
    $stmt->bind_param('i', $garment_id);
    $stmt->execute();
    $stmt->close();
    $stmt = $conn->prepare('DELETE FROM garments WHERE id = ?');
    $stmt->bind_param('i', $garment_id);
    $stmt->execute();
    $stmt->close();
    $stmt = $conn->prepare('SELECT id FROM garments WHERE image_path = ? LIMIT 1');
    $stmt->bind_param('s', $image_path);
    $stmt->execute();
    $shared_image = $stmt->get_result()->num_rows > 0;
    $stmt->close();
    $conn->commit();
} catch (mysqli_sql_exception $error) {
    $conn->rollback();
    error_log((string)$error);
    api_error(500, 'Could not delete this garment. Please try again.');
}

// Only remove an unshared uploaded photo inside the uploads directory.
// Bundled sample images remain available for a fresh demo database.
$filename = basename($image_path);
$upload_dir = realpath(__DIR__ . '/../uploads');
$photo = $upload_dir ? realpath($upload_dir . DIRECTORY_SEPARATOR . $filename) : false;
if (!$shared_image && $image_path === 'uploads/' . $filename
    && str_starts_with($filename, 'garment_') && $photo
    && dirname($photo) === $upload_dir && is_file($photo)) {
    if (!@unlink($photo)) error_log('Garment deleted; its unused photo could not be removed.');
}
$conn->close();
echo json_encode(['status' => 'success', 'message' => 'Garment and wear history deleted.']);
