<?php
require_once __DIR__ . '/api.php';
api_method('GET');
require_once __DIR__ . '/db_connect.php';

// Most Loved: Top 4 most-worn items
$loved_sql = "SELECT g.*, COUNT(w.log_id) AS total_wears, MAX(w.worn_date) AS last_worn 
              FROM garments g 
              JOIN wear_history w ON g.id = w.garment_id 
              GROUP BY g.id 
              ORDER BY total_wears DESC, g.id DESC 
              LIMIT 4";
$loved_result = $conn->query($loved_sql);
$most_loved = [];
while ($row = $loved_result->fetch_assoc()) {
    $row['id'] = (int)$row['id'];
    $row['total_wears'] = (int)$row['total_wears'];
    $most_loved[] = $row;
}

// Recently Worn: Latest 4 worn items by date
$recent_sql = "SELECT g.*, COUNT(w.log_id) AS total_wears, MAX(w.worn_date) AS last_worn 
               FROM garments g 
               JOIN wear_history w ON g.id = w.garment_id 
               GROUP BY g.id 
               ORDER BY last_worn DESC, g.id DESC 
               LIMIT 4";
$recent_result = $conn->query($recent_sql);
$recently_worn = [];
while ($row = $recent_result->fetch_assoc()) {
    $row['id'] = (int)$row['id'];
    $row['total_wears'] = (int)$row['total_wears'];
    $recently_worn[] = $row;
}

echo json_encode([
    "status" => "success",
    "most_loved" => $most_loved,
    "recently_worn" => $recently_worn
]);

$conn->close();
