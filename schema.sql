
CREATE TABLE IF NOT EXISTS menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(500) DEFAULT NULL,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    FOREIGN KEY (order_id)
        REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id)
        REFERENCES menu_items(id),
    CHECK (quantity > 0),
    CHECK (unit_price >= 0),
    CHECK (subtotal >= 0)
);

INSERT INTO menu_items (name, category, description, price)
VALUES
    ('Veg Fried Rice', 'Meals', 'Vegetable fried rice', 80.00),
    ('Veg Burger', 'Snacks', 'Burger with fresh vegetables', 60.00),
    ('Masala Dosa', 'Breakfast', 'Crispy dosa with masala filling', 50.00),
    ('Samosa', 'Snacks', 'Crispy potato-filled snack', 20.00),
    ('Tea', 'Drinks', 'Hot tea', 15.00),
    ('Fresh Lime Juice', 'Drinks', 'Refreshing lime juice', 30.00);
