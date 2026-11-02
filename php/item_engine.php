<?php
require_once __DIR__ . '/api.php';
api_method('GET');
$id = api_id($_GET, 'id');
require_once __DIR__ . '/db_connect.php';

// 1. Fetch clicked garment details + wear stats from wear_history table
$sql = "SELECT g.*, 
               COUNT(w.log_id) AS times_worn, 
               MAX(w.worn_date) AS last_worn 
        FROM garments g 
        LEFT JOIN wear_history w ON g.id = w.garment_id 
        WHERE g.id = ? 
        GROUP BY g.id";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();
$item = $result->fetch_assoc();
$stmt->close();

if (!$item) api_error(404, 'Garment not found in your wardrobe.');
$item['id'] = (int)$item['id'];

$item['times_worn'] = (int)$item['times_worn'];

// 2. Complete the Look Recommendation Engine:
// Find complementary categories from the user's wardrobe that share occasion and compatible colors
$target_categories = [];
switch ($item['category']) {
    case 'Top':
        $target_categories = ['Bottom', 'Footwear'];
        break;
    case 'Bottom':
        $target_categories = ['Top', 'Footwear'];
        break;
    case 'One-Piece':
        $target_categories = ['Footwear'];
        break;
    case 'Footwear':
        $target_categories = ['Top', 'Bottom', 'One-Piece'];
        break;
    default:
        $target_categories = ['Top', 'Bottom'];
}

$recommendations = [];

foreach ($target_categories as $target_cat) {
    // Recommendation query: Complementary category + same occasion + compatible color family
    $rec_sql = "SELECT * FROM garments 
                WHERE category = ? 
                  AND occasion = ? 
                  AND (color_family = 'Neutral' OR color_family = ? OR ? = 'Neutral')
                  AND id != ?
                ORDER BY id DESC LIMIT 3";
    
    $rec_stmt = $conn->prepare($rec_sql);
    if ($rec_stmt) {
        $rec_stmt->bind_param("ssssi", $target_cat, $item['occasion'], $item['color_family'], $item['color_family'], $id);
        $rec_stmt->execute();
        $rec_result = $rec_stmt->get_result();
        
        while ($rec = $rec_result->fetch_assoc()) {
            // Accessible explanation for color-blind users (WCAG 2.1 AA requirement)
            $color_explanation = "";
            if ($rec['color_family'] === 'Neutral') {
                $color_explanation = "Neutral Match: {$rec['color_name']} neutral balances {$item['color_name']}.";
            } elseif ($item['color_family'] === 'Neutral') {
                $color_explanation = "Neutral Match: {$item['color_name']} neutral pairs seamlessly with {$rec['color_name']}.";
            } elseif ($rec['color_family'] === $item['color_family']) {
                $color_explanation = "Harmonious {$item['color_family']} Tones: {$item['color_name']} pairs with {$rec['color_name']}.";
            } else {
                $color_explanation = "Color Pairing: {$item['color_name']} complements {$rec['color_name']}.";
            }

            $rec['match_reason'] = "Occasion: {$item['occasion']} wear • {$color_explanation}";
            $recommendations[] = $rec;
        }
        $rec_stmt->close();
    }
}

// Fallback: If no exact occasion matches found, search for compatible colors in complementary categories
if (empty($recommendations)) {
    foreach ($target_categories as $target_cat) {
        $fb_sql = "SELECT * FROM garments 
                   WHERE category = ? 
                     AND (color_family = 'Neutral' OR color_family = ? OR ? = 'Neutral')
                     AND id != ?
                   ORDER BY id DESC LIMIT 2";
        $fb_stmt = $conn->prepare($fb_sql);
        if ($fb_stmt) {
            $fb_stmt->bind_param("sssi", $target_cat, $item['color_family'], $item['color_family'], $id);
            $fb_stmt->execute();
            $fb_res = $fb_stmt->get_result();
            while ($rec = $fb_res->fetch_assoc()) {
                $rec['match_reason'] = "Versatile Match: {$rec['color_name']} {$rec['category']} pairs with {$item['color_name']}.";
                $recommendations[] = $rec;
            }
            $fb_stmt->close();
        }
    }
}

echo json_encode([
    "status" => "success",
    "item" => $item,
    "recommendations" => $recommendations
]);

$conn->close();
