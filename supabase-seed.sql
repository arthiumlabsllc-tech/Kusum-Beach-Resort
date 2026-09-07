-- =============================================
-- KUSUM BEACH - COMPLETE SEED (run all at once)
-- =============================================

-- Clean up first
DELETE FROM "system_settings";
DELETE FROM "alert_recipients";
DELETE FROM "alert_logs";
DELETE FROM "payments";
DELETE FROM "order_items";
DELETE FROM "orders";
DELETE FROM "stock_movements";
DELETE FROM "shifts";
DELETE FROM "products";
DELETE FROM "categories";
DELETE FROM "users";

-- Reset sequences
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE categories_id_seq RESTART WITH 1;
ALTER SEQUENCE products_id_seq RESTART WITH 1;

-- Admin user (password: admin123)
INSERT INTO "users" ("username", "password_hash", "full_name", "phone", "email", "role", "is_active", "updated_at") VALUES
('admin', '$2a$10$O2ihE9Z7dPveAU46SUJxkeCtC77rz24pXb2vImp5dQJaNRwAwn/KW', 'System Admin', '0201234567', 'admin@kusumbeach.com', 'owner', true, NOW());

-- Categories
INSERT INTO "categories" ("name", "description", "icon") VALUES
('Beers', 'Local and imported beers', 'beer'),
('Spirits', 'Whiskey, vodka, rum, gin, etc.', 'glass'),
('Cocktails', 'Mixed drinks and cocktails', 'cocktail'),
('Soft Drinks', 'Non-alcoholic beverages', 'cup'),
('Water', 'Bottled and sachet water', 'droplet'),
('Juices', 'Fresh and packaged juices', 'cherry'),
('Energy Drinks', 'Energy and sports drinks', 'zap'),
('Mixers', 'Tonic, soda, mixers', 'glass'),
('Snacks', 'Small chops and snacks', 'coffee'),
('Wines', 'Red, white, and rosé wines', 'wine');

-- Products
INSERT INTO "products" ("name", "category_id", "unit", "stock_quantity", "reorder_level", "reorder_quantity", "buying_price", "selling_price", "supplier", "status", "updated_at") VALUES
('Club Beer', 1, 'Bottle', 120, 24, 48, 8.00, 12.00, 'Accra Brewery', 'active', NOW()),
('Star Beer', 1, 'Bottle', 96, 24, 48, 8.00, 12.00, 'Accra Brewery', 'active', NOW()),
('Guinness', 1, 'Bottle', 72, 20, 40, 10.00, 15.00, 'DIAGEO Ghana', 'active', NOW()),
('Castle Lite', 1, 'Bottle', 60, 20, 40, 9.00, 14.00, 'South African Breweries', 'active', NOW()),
('Heineken', 1, 'Bottle', 48, 15, 30, 12.00, 18.00, 'Heineken Ghana', 'active', NOW()),
('Tres Maravillas', 1, 'Bottle', 36, 12, 24, 15.00, 22.00, 'Imported', 'active', NOW()),
('Club Beer Large', 1, 'Bottle', 48, 12, 24, 12.00, 18.00, 'Accra Brewery', 'active', NOW()),
('Star Beer Large', 1, 'Bottle', 36, 12, 24, 12.00, 18.00, 'Accra Brewery', 'active', NOW()),
('Akpeteshie (Local Gin)', 2, 'Shot', 30, 10, 20, 3.00, 5.00, 'Local Distiller', 'active', NOW()),
('Jameson Whiskey', 2, 'Shot', 20, 5, 10, 15.00, 25.00, 'Pernod Ricard', 'active', NOW()),
('Smirnoff Vodka', 2, 'Shot', 25, 5, 10, 12.00, 20.00, 'Diageo', 'active', NOW()),
('Captain Morgan Rum', 2, 'Shot', 18, 5, 10, 14.00, 22.00, 'Diageo', 'active', NOW()),
('Gordon''s Gin', 2, 'Shot', 15, 5, 10, 13.00, 20.00, 'Diageo', 'active', NOW()),
('Hennessy Cognac', 2, 'Shot', 10, 3, 6, 35.00, 55.00, 'Moet Hennessy', 'active', NOW()),
('Jack Daniel''s', 2, 'Shot', 12, 3, 6, 30.00, 45.00, 'Brown-Forman', 'active', NOW()),
('Johnnie Walker Red', 2, 'Shot', 15, 5, 10, 25.00, 40.00, 'Diageo', 'active', NOW()),
('Mojito', 3, 'Glass', 50, 10, 20, 8.00, 25.00, 'Bar', 'active', NOW()),
('Pina Colada', 3, 'Glass', 50, 10, 20, 10.00, 30.00, 'Bar', 'active', NOW()),
('Margarita', 3, 'Glass', 50, 10, 20, 9.00, 28.00, 'Bar', 'active', NOW()),
('Daiquiri', 3, 'Glass', 50, 10, 20, 8.00, 25.00, 'Bar', 'active', NOW()),
('Gin & Tonic', 3, 'Glass', 50, 10, 20, 6.00, 20.00, 'Bar', 'active', NOW()),
('Coca-Cola', 4, 'Can', 200, 48, 96, 3.00, 5.00, 'Kasapreko', 'active', NOW()),
('Fanta Orange', 4, 'Can', 150, 36, 72, 3.00, 5.00, 'Kasapreko', 'active', NOW()),
('Sprite', 4, 'Can', 150, 36, 72, 3.00, 5.00, 'Kasapreko', 'active', NOW()),
('Schweppes Tonic', 4, 'Can', 80, 20, 40, 4.00, 6.00, 'Kasapreko', 'active', NOW()),
('Ginger Ale', 4, 'Can', 80, 20, 40, 4.00, 6.00, 'Kasapreko', 'active', NOW()),
('Voltic Water (500ml)', 5, 'Bottle', 300, 60, 120, 1.50, 3.00, 'Voltic', 'active', NOW()),
('Voltic Water (1.5L)', 5, 'Bottle', 150, 30, 60, 3.00, 5.00, 'Voltic', 'active', NOW()),
('Dasani Water', 5, 'Bottle', 100, 24, 48, 2.00, 4.00, 'Coca-Cola', 'active', NOW()),
('Fresh Coconut Water', 6, 'Glass', 40, 10, 20, 3.00, 8.00, 'Local', 'active', NOW()),
('Mango Juice', 6, 'Glass', 30, 10, 20, 4.00, 10.00, 'Local', 'active', NOW()),
('Pineapple Juice', 6, 'Glass', 30, 10, 20, 4.00, 10.00, 'Local', 'active', NOW()),
('Fresh Lime Juice', 6, 'Glass', 25, 8, 16, 3.00, 8.00, 'Local', 'active', NOW()),
('Minute Maid Orange', 6, 'Can', 60, 15, 30, 4.00, 7.00, 'Coca-Cola', 'active', NOW()),
('Red Bull', 7, 'Can', 48, 12, 24, 10.00, 15.00, 'Red Bull Ghana', 'active', NOW()),
('Monster Energy', 7, 'Can', 36, 10, 20, 12.00, 18.00, 'Imported', 'active', NOW()),
('Extra Power', 7, 'Can', 60, 15, 30, 5.00, 8.00, 'Kasapreko', 'active', NOW()),
('Soda Water', 8, 'Can', 80, 20, 40, 2.50, 4.00, 'Kasapreko', 'active', NOW()),
('Tonic Water', 8, 'Can', 80, 20, 40, 3.00, 5.00, 'Schweppes', 'active', NOW()),
('Lime Cordial', 8, 'Bottle', 20, 5, 10, 8.00, 12.00, 'Imported', 'active', NOW()),
('Grenadine Syrup', 8, 'Bottle', 15, 5, 10, 10.00, 15.00, 'Imported', 'active', NOW()),
('Groundnuts (Roasted)', 9, 'Pack', 100, 20, 40, 2.00, 5.00, 'Local', 'active', NOW()),
('Plantain Chips', 9, 'Pack', 80, 20, 40, 3.00, 6.00, 'Local', 'active', NOW()),
('Meat Pie', 9, 'Pack', 30, 10, 20, 5.00, 10.00, 'Local Bakery', 'active', NOW()),
('Spring Roll', 9, 'Pack', 30, 10, 20, 4.00, 8.00, 'Local Bakery', 'active', NOW()),
('Kelewele', 9, 'Pack', 25, 10, 20, 3.00, 7.00, 'Local', 'active', NOW());

-- System Settings
INSERT INTO "system_settings" ("setting_key", "setting_value", "description") VALUES
('business_name', 'Kusum Beach Resort', 'Business name'),
('currency', 'GHS', 'Default currency (Ghana Cedis)'),
('currency_symbol', 'GH₵', 'Currency symbol'),
('tax_rate', '0', 'Default tax rate (%)'),
('low_stock_check_interval', '300000', 'Low stock check interval (ms)'),
('receipt_footer', 'Thank you for visiting Kusum Beach!', 'Receipt footer message'),
('timezone', 'Africa/Accra', 'Business timezone'),
('momo_mtn_enabled', 'false', 'MTN MoMo payments enabled'),
('crypto_enabled', 'false', 'Crypto payments enabled');
