<?php
require_once __DIR__ . '/api.php';
api_method('POST', 'multipart/form-data');
// PHP discards the entire form when post_max_size is exceeded.
if (empty($_POST) && empty($_FILES) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 5 * 1024 * 1024) {
    api_error(413, 'Garment photo exceeds the upload limit. Choose a photo no larger than 5 MB.');
}
$limits = ['garment_name' => 100, 'category' => 20, 'color_family' => 20, 'color_name' => 50, 'fabric' => 50, 'occasion' => 50, 'shelf_location' => 100];
$values = [];
foreach ($limits as $field => $limit) {
    $values[$field] = api_text($_POST, $field);
    if ($values[$field] === '' || api_length($values[$field]) > $limit) {
        api_error(400, str_replace('_', ' ', ucfirst($field)) . " is required and must be $limit characters or fewer.");
    }
}
if (!in_array($values['category'], ['Top', 'Bottom', 'One-Piece', 'Footwear'], true)) api_error(400, 'Select a valid category.');
if (!in_array($values['color_family'], ['Neutral', 'Warm', 'Cool'], true)) api_error(400, 'Select a valid color family.');
$file = $_FILES['garment_photo'] ?? null;
if (!$file || !is_int($file['error'])) api_error(400, 'Please upload a valid garment photo.');
if (in_array($file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) || $file['size'] > 5 * 1024 * 1024) {
    api_error(413, 'Garment photo exceeds the upload limit. Choose a photo no larger than 5 MB.');
}
if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) api_error(400, 'Please upload a valid garment photo.');
$extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
$dimensions = @getimagesize($file['tmp_name']);
if (!isset($extensions[$mime]) || !$dimensions || ($dimensions['mime'] ?? '') !== $mime) {
    api_error(400, 'Uploaded photo must be a valid JPG, PNG, or WebP image.');
}
require_once __DIR__ . '/db_connect.php';
$upload_dir = __DIR__ . '/../uploads';
if (!is_dir($upload_dir) && !@mkdir($upload_dir, 0755, true)) api_error(500, 'Could not create the photo directory. Check its permissions.');
$filename = 'garment_' . bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
$destination = $upload_dir . '/' . $filename;
if (!@move_uploaded_file($file['tmp_name'], $destination)) api_error(500, 'Could not save the photo. Check the uploads directory permissions.');
$image_path = 'uploads/' . $filename;
$alt_text = "{$values['color_name']} {$values['fabric']} {$values['category']} for {$values['occasion']} wear, stored at {$values['shelf_location']}";
// Match VARCHAR(255) in Unicode characters, not bytes.
preg_match_all('/./us', $alt_text, $characters);
$alt_text = implode('', array_slice($characters[0], 0, 255));
try {
    $stmt = $conn->prepare('INSERT INTO garments (garment_name, category, color_family, color_name, fabric, occasion, shelf_location, image_path, alt_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->bind_param('sssssssss', $values['garment_name'], $values['category'], $values['color_family'], $values['color_name'], $values['fabric'], $values['occasion'], $values['shelf_location'], $image_path, $alt_text);
    $stmt->execute();
    $new_id = $stmt->insert_id;
    $stmt->close();
} catch (Throwable $error) {
    if (!@unlink($destination)) error_log('Could not clean up a failed garment upload.');
    throw $error;
}
api_json(['status' => 'success', 'message' => $values['garment_name'] . ' was successfully added to your closet!', 'garment_id' => $new_id, 'redirect' => 'closet.html']);
