<?php
require_once __DIR__ . '/api.php';
api_method('GET');
$occasion = api_text($_GET, 'occasion') ?: null;
$category = api_text($_GET, 'category') ?: null;
$color_family = api_text($_GET, 'color_family') ?: null;
$fabric = api_text($_GET, 'fabric') ?: null;
$sort = api_text($_GET, 'sort', 'newest');
require_once __DIR__ . '/db_connect.php';

// Base SQL query joining garments with wear_history aggregation
$sql = "SELECT g.*, 
               COUNT(w.log_id) AS wear_count, 
               MAX(w.worn_date) AS last_worn 
        FROM garments g 
        LEFT JOIN wear_history w ON g.id = w.garment_id";

$conditions = [];
$params     = [];
$types      = '';

// Add dynamic filter conditions
if ($occasion !== null) {
    $conditions[] = "g.occasion = ?";
    $params[]     = $occasion;
    $types       .= 's';
}

if ($category !== null) {
    $conditions[] = "g.category = ?";
    $params[]     = $category;
    $types       .= 's';
}

if ($color_family !== null) {
    $conditions[] = "g.color_family = ?";
    $params[]     = $color_family;
    $types       .= 's';
}

if ($fabric !== null) {
    $conditions[] = "g.fabric = ?";
    $params[]     = $fabric;
    $types       .= 's';
}

if (!empty($conditions)) {
    $sql .= " WHERE " . implode(" AND ", $conditions);
}

// Group by garment to aggregate wear stats
$sql .= " GROUP BY g.id";

// Dynamic sorting
switch ($sort) {
    case 'least_worn':
        // Unworn items first (last_worn IS NULL), then oldest last_worn date
        $sql .= " ORDER BY (last_worn IS NOT NULL) ASC, last_worn ASC, wear_count ASC, g.id DESC";
        break;
    case 'most_worn':
        $sql .= " ORDER BY wear_count DESC, g.id DESC";
        break;
    default: // newest
        $sql .= " ORDER BY g.id DESC";
        break;
}

$stmt = $conn->prepare($sql);

if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$result = $stmt->get_result();

$garments = [];
while ($row = $result->fetch_assoc()) {
    $row['id'] = (int)$row['id'];
    $row['wear_count'] = (int)$row['wear_count'];
    $garments[] = $row;
}

echo json_encode([
    'status' => 'success',
    'count' => count($garments),
    'garments' => $garments
]);

$stmt->close();
$conn->close();
