-- Create Tables
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    country VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    price_per_unit DECIMAL(10, 2) NOT NULL
);

-- Insert Fabricated Customers
INSERT INTO customers (name, email, country, created_at) VALUES
('John Doe', 'john.doe@example.com', 'USA', NOW() - INTERVAL '30 days'),
('Jane Smith', 'jane.smith@example.com', 'Canada', NOW() - INTERVAL '25 days'),
('Alice Johnson', 'alice.johnson@example.com', 'UK', NOW() - INTERVAL '15 days'),
('Bob Brown', 'bob.brown@example.com', 'Germany', NOW() - INTERVAL '10 days'),
('Charlie Wilson', 'charlie.wilson@example.com', 'USA', NOW() - INTERVAL '5 days'),
('Devi Prasad', 'devi.prasad@example.com', 'India', NOW() - INTERVAL '3 days');

-- Insert Fabricated Products
INSERT INTO products (name, category, price, stock) VALUES
('iPhone 15 Pro', 'Electronics', 999.99, 50),
('MacBook Air M3', 'Electronics', 1099.99, 30),
('Sony WH-1000XM5', 'Electronics', 399.99, 100),
('Ergonomic Office Chair', 'Furniture', 249.99, 40),
('Wireless Mechanical Keyboard', 'Electronics', 129.99, 75),
('Leather Journal Notebook', 'Stationery', 24.99, 200),
('Stainless Steel Water Bottle', 'Home & Kitchen', 19.99, 150),
('Premium Cotton T-Shirt', 'Apparel', 29.99, 300);

-- Insert Fabricated Orders
INSERT INTO orders (customer_id, order_date, total_amount, status) VALUES
(1, NOW() - INTERVAL '28 days', 1399.98, 'Completed'),
(2, NOW() - INTERVAL '20 days', 24.99, 'Completed'),
(3, NOW() - INTERVAL '14 days', 1099.99, 'Completed'),
(1, NOW() - INTERVAL '8 days', 149.98, 'Completed'),
(4, NOW() - INTERVAL '6 days', 399.99, 'Shipped'),
(5, NOW() - INTERVAL '2 days', 1044.97, 'Pending'),
(6, NOW() - INTERVAL '1 day', 49.98, 'Pending');

-- Insert Fabricated Order Items
INSERT INTO order_items (order_id, product_id, quantity, price_per_unit) VALUES
-- Order 1 (John Doe)
(1, 1, 1, 999.99),
(1, 3, 1, 399.99),
-- Order 2 (Jane Smith)
(2, 6, 1, 24.99),
-- Order 3 (Alice Johnson)
(3, 2, 1, 1099.99),
-- Order 4 (John Doe)
(4, 5, 1, 129.99),
(4, 7, 1, 19.99),
-- Order 5 (Bob Brown)
(5, 3, 1, 399.99),
-- Order 6 (Charlie Wilson)
(6, 1, 1, 999.99),
(6, 7, 1, 19.99),
(6, 8, 1, 29.99),
-- Order 7 (Devi Prasad)
(7, 7, 1, 19.99),
(7, 8, 1, 29.99);
