CREATE TABLE IF NOT EXISTS menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(500) DEFAULT NULL,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_menu_items_category (category),
    CHECK (price >= 0)
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_contact VARCHAR(30),
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status ENUM(
        'Pending',
        'Preparing',
        'Ready',
        'Completed'
    ) NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_orders_status_created (status, created_at),
    CHECK (total_amount >= 0)
);

CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    KEY idx_order_items_order (order_id),
    FOREIGN KEY (order_id)
        REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id)
        REFERENCES menu_items(id),
    CHECK (quantity > 0),
    CHECK (unit_price >= 0),
    CHECK (subtotal >= 0)
);

INSERT INTO menu_items (name, category, description, price)
SELECT seed.name, seed.category, seed.description, seed.price
FROM (
    SELECT 'Veg Fried Rice' AS name, 'Meals' AS category,
           'Vegetable fried rice' AS description, 80.00 AS price
    UNION ALL
    SELECT 'Veg Burger', 'Snacks', 'Burger with fresh vegetables', 60.00
    UNION ALL
    SELECT 'Masala Dosa', 'Breakfast', 'Crispy dosa with masala filling', 50.00
    UNION ALL
    SELECT 'Samosa', 'Snacks', 'Crispy potato-filled snack', 20.00
    UNION ALL
    SELECT 'Tea', 'Drinks', 'Hot tea', 15.00
    UNION ALL
    SELECT 'Fresh Lime Juice', 'Drinks', 'Refreshing lime juice', 30.00
) AS seed
WHERE NOT EXISTS (
    SELECT 1 FROM menu_items WHERE menu_items.name = seed.name
);
