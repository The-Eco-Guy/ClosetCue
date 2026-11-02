-- ClosetCue Database Setup Script
-- A Myntra-style Smart Wardrobe Platform

CREATE DATABASE IF NOT EXISTS closetcue_retro_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE closetcue_retro_db;

-- ============================================================
-- Table: garments
-- Stores all wardrobe items with metadata
-- ============================================================
CREATE TABLE garments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    garment_name VARCHAR(100) NOT NULL,
    category ENUM('Top', 'Bottom', 'One-Piece', 'Footwear') NOT NULL,
    color_family ENUM('Neutral', 'Warm', 'Cool') NOT NULL,
    color_name VARCHAR(50) NOT NULL,
    fabric VARCHAR(50) NOT NULL,
    occasion VARCHAR(50) NOT NULL,
    shelf_location VARCHAR(100) NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    alt_text VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: wear_history
-- Logs each time a garment is worn
-- ============================================================
CREATE TABLE wear_history (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    garment_id INT NOT NULL,
    worn_date DATE NOT NULL,
    event_note VARCHAR(100) DEFAULT 'Daily Wear',
    FOREIGN KEY (garment_id) REFERENCES garments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Seed Data: 10 Sample Garments
-- Covers all categories, color families, fabrics, occasions
-- ============================================================
INSERT INTO garments (garment_name, category, color_family, color_name, fabric, occasion, shelf_location, image_path, alt_text) VALUES
('Crimson Chikankari Kurta', 'Top', 'Warm', 'Crimson Red', 'Cotton', 'Festive', 'Shelf A – Top Row', 'uploads/kurta1.jpg', 'Crimson Red Cotton Top for Festive wear, stored at Shelf A – Top Row'),
('Classic Indigo Slim Jeans', 'Bottom', 'Cool', 'Indigo Blue', 'Denim', 'Casual', 'Shelf B – Middle Row', 'uploads/jeans1.jpg', 'Indigo Blue Denim Bottom for Casual wear, stored at Shelf B – Middle Row'),
('Ivory Linen Palazzo', 'Bottom', 'Neutral', 'Ivory White', 'Linen', 'Summery', 'Shelf B – Bottom Row', 'uploads/palazzo1.jpg', 'Ivory White Linen Bottom for Summery wear, stored at Shelf B – Bottom Row'),
('Black Formal Oxford Shoes', 'Footwear', 'Neutral', 'Jet Black', 'Leather', 'Formal', 'Shoe Rack – Slot 1', 'uploads/oxford1.jpg', 'Jet Black Leather Footwear for Formal wear, stored at Shoe Rack – Slot 1'),
('Navy Blue Satin Jumpsuit', 'One-Piece', 'Cool', 'Navy Blue', 'Satin', 'Party', 'Shelf C – Top Row', 'uploads/jumpsuit1.jpg', 'Navy Blue Satin One-Piece for Party wear, stored at Shelf C – Top Row'),
('Olive Cargo Joggers', 'Bottom', 'Warm', 'Olive Green', 'Twill', 'Casual', 'Shelf B – Top Row', 'uploads/joggers1.jpg', 'Olive Green Twill Bottom for Casual wear, stored at Shelf B – Top Row'),
('Pearl Grey Formal Blazer', 'Top', 'Neutral', 'Pearl Grey', 'Polyester Blend', 'Formal', 'Shelf A – Middle Row', 'uploads/blazer1.jpg', 'Pearl Grey Polyester Blend Top for Formal wear, stored at Shelf A – Middle Row'),
('Sunset Orange Anarkali Suit', 'One-Piece', 'Warm', 'Sunset Orange', 'Georgette', 'Festive', 'Shelf C – Middle Row', 'uploads/anarkali1.jpg', 'Sunset Orange Georgette One-Piece for Festive wear, stored at Shelf C – Middle Row'),
('Teal Silk Wrap Blouse', 'Top', 'Cool', 'Teal Blue', 'Silk', 'Party', 'Shelf A – Bottom Row', 'uploads/blouse1.jpg', 'Teal Blue Silk Top for Party wear, stored at Shelf A – Bottom Row'),
('Tan Suede Loafers', 'Footwear', 'Warm', 'Tan Brown', 'Suede', 'Casual', 'Shoe Rack – Slot 3', 'uploads/loafers1.jpg', 'Tan Brown Suede Footwear for Casual wear, stored at Shoe Rack – Slot 3');

-- ============================================================
-- Seed Data: 18 Sample Wear History Entries
-- Distribution:
--   Garment 1 (Kurta)       : 6 wears  → "Most Loved"
--   Garment 2 (Jeans)       : 5 wears  → "Most Loved"
--   Garment 5 (Jumpsuit)    : 2 wears  → moderate
--   Garment 6 (Joggers)     : 1 wear   → low
--   Garment 7 (Blazer)      : 1 wear   → recent
--   Garment 9 (Blouse)      : 2 wears  → recent
--   Garment 10 (Loafers)    : 1 wear   → recent
--   Garments 3, 4, 8        : 0 wears  → "Unworn Gem"
-- ============================================================
INSERT INTO wear_history (garment_id, worn_date, event_note) VALUES
-- Garment 1: Crimson Chikankari Kurta — Most Loved (6 wears)
(1, '2026-10-02', 'Diwali Prep Party'),
(1, '2026-10-06', 'Family Dinner'),
(1, '2026-10-10', 'Office Ethnic Day'),
(1, '2026-10-15', 'Navratri Celebration'),
(1, '2026-10-20', 'College Fest'),
(1, '2026-10-27', 'Diwali Evening'),

-- Garment 2: Classic Indigo Slim Jeans — Most Loved (5 wears)
(2, '2026-10-01', 'Daily Wear'),
(2, '2026-10-07', 'Weekend Outing'),
(2, '2026-10-12', 'Movie Night'),
(2, '2026-10-19', 'Café Meetup'),
(2, '2026-10-25', 'Daily Wear'),

-- Garment 5: Navy Blue Satin Jumpsuit (2 wears)
(5, '2026-10-05', 'Birthday Party'),
(5, '2026-10-22', 'House Party'),

-- Garment 6: Olive Cargo Joggers (1 wear)
(6, '2026-10-14', 'Gym Session'),

-- Garment 7: Pearl Grey Formal Blazer — Recently Worn (1 wear)
(7, '2026-10-28', 'Client Presentation'),

-- Garment 9: Teal Silk Wrap Blouse — Recently Worn (2 wears)
(9, '2026-10-26', 'Cocktail Night'),
(9, '2026-10-29', 'Office Party'),

-- Garment 10: Tan Suede Loafers — Recently Worn (1 wear)
(10, '2026-10-29', 'Brunch Outing');
