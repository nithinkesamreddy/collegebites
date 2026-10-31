# CollegeBites

CollegeBites is a full-stack college canteen ordering platform built with Python, Flask, and MySQL. Students can browse the daily menu, search and filter dishes, build a cart, place orders, and track order progress. Canteen staff can manage incoming orders from a dedicated dashboard.

The application uses server-rendered Jinja2 pages for the interface and a JSON API for menu, cart checkout, and order management.

---

## Project Details

### Purpose

College canteens usually rely on queues and manual order taking. CollegeBites digitizes the menu and ordering flow so students can decide what to eat, place an order, and track its status without waiting in line.

### Main Users

- **Students**: browse the menu, search dishes, manage a cart, and place orders.
- **Canteen staff**: view incoming orders and move them through the preparation workflow.

### Architecture

```text
Browser
  |
  | HTML pages + JavaScript fetch()
  v
Flask application (app.py)
  |
  | mysql-connector-python
  v
MySQL / MariaDB database
  |
  +-- menu_items
  +-- orders
  +-- order_items
```

- The Flask backend serves pages and exposes REST-style JSON endpoints.
- The frontend uses vanilla JavaScript to call the API and keep the cart in `localStorage`.
- The backend recalculates all prices and validates availability before saving an order.
- Orders and order line items are written inside a database transaction.

### Order Lifecycle

```text
Pending -> Preparing -> Ready -> Completed
```

Only forward transitions are allowed. A completed order cannot be moved backward.

---

## Features

1. **Interactive food menu** with dish cards, category labels, descriptions, prices, availability, and optional images.
2. **Live search and category filters** that update the menu without reloading the page.
3. **Persistent cart** stored in browser `localStorage`, with quantity controls, remove, and clear actions.
4. **Cart badge** in the navigation bar that stays synchronized across pages.
5. **Checkout form** collecting the customer name and optional contact details.
6. **Server-side validation** for menu item existence, availability, quantity limits, and prices.
7. **Transactional order creation** that stores the order and all line items together.
8. **Orders dashboard** with status filters, customer details, line items, totals, and status update buttons.
9. **Automatic refresh** of the orders dashboard every 30 seconds while the page is visible.
10. **Health check** endpoint that also verifies the database connection.
11. **Responsive design** for desktop, tablet, and mobile screens.

---

## Technologies Used

### Backend

- Python 3
- Flask
- mysql-connector-python
- python-dotenv

### Frontend

- HTML5
- Jinja2 templates
- CSS3 with flexbox and grid
- Vanilla JavaScript (`fetch`, `localStorage`, DOM APIs)

### Database

- MySQL or MariaDB

---

## Project Structure

```text
collegebites/
├── static/
│   ├── css/
│   │   └── style.css          # Shared styles for menu, cart, and orders
│   └── js/
│       ├── common.js          # Cart storage, badge, currency, and toast helpers
│       ├── menu.js            # Menu loading, search, filters, and add-to-cart
│       ├── cart.js            # Cart rendering, quantity edits, and checkout
│       └── orders.js          # Orders dashboard and status updates
├── templates/
│   ├── base.html              # Shared layout and navigation
│   ├── menu.html              # Food menu page
│   ├── cart.html              # Cart and checkout page
│   └── orders.html            # Order management page
├── app.py                     # Flask routes and JSON API
├── database.py                # MySQL connection management
├── schema.sql                 # Table definitions and seed data
├── .env.example               # Example environment configuration
├── requirements.txt           # Python dependencies
└── README.md
```

---

## Database Design

### `menu_items`

Stores the canteen catalog.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | INT | Primary key |
| `name` | VARCHAR(100) | Dish name |
| `category` | VARCHAR(50) | Breakfast, Meals, Snacks, Drinks, etc. |
| `description` | VARCHAR(255) | Short description |
| `price` | DECIMAL(10, 2) | Must be zero or greater |
| `image_url` | VARCHAR(500) | Optional image URL |
| `available` | BOOLEAN | Whether the dish can be ordered |
| `created_at` | TIMESTAMP | Creation time |

### `orders`

Stores customer orders.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | INT | Primary key |
| `customer_name` | VARCHAR(100) | Required |
| `customer_contact` | VARCHAR(30) | Optional |
| `total_amount` | DECIMAL(10, 2) | Calculated by the backend |
| `status` | ENUM | Pending, Preparing, Ready, Completed |
| `created_at` | TIMESTAMP | Order time |

### `order_items`

Stores the dishes in each order.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | INT | Primary key |
| `order_id` | INT | Foreign key to `orders`, cascade delete |
| `menu_item_id` | INT | Foreign key to `menu_items` |
| `item_name` | VARCHAR(100) | Snapshot of the dish name |
| `quantity` | INT | Must be greater than zero |
| `unit_price` | DECIMAL(10, 2) | Price at order time |
| `subtotal` | DECIMAL(10, 2) | Quantity multiplied by unit price |

The schema includes six seeded menu items. Seed inserts are idempotent, so importing `schema.sql` more than once does not duplicate the menu.

---

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | Food menu page |
| `GET` | `/cart` | Cart and checkout page |
| `GET` | `/orders` | Orders dashboard |
| `GET` | `/api/menu` | List all menu items |
| `GET` | `/api/orders` | List orders with line items; optional `?status=Pending` |
| `GET` | `/api/orders/<id>` | Fetch one order |
| `POST` | `/api/orders` | Place a new order |
| `PATCH` | `/api/orders/<id>/status` | Advance an order status |
| `GET` | `/health` | Check service and database health |

### Place an Order

```http
POST /api/orders
Content-Type: application/json

{
  "customer_name": "Nithin",
  "customer_contact": "9876543210",
  "items": [
    { "menu_item_id": 2, "quantity": 1 },
    { "menu_item_id": 5, "quantity": 2 }
  ]
}
```

The backend validates each item, checks availability, calculates the total from database prices, and saves the order and line items in a single transaction.

### Update Order Status

```http
PATCH /api/orders/1/status
Content-Type: application/json

{ "status": "Preparing" }
```

Valid transitions:

- `Pending` -> `Preparing`
- `Preparing` -> `Ready`
- `Ready` -> `Completed`

Invalid transitions return HTTP `409`.

---

## Prerequisites

- Python 3.8 or newer
- MySQL Server or MariaDB
- `pip`
- A terminal or command prompt

---

## How to Run the Project

### 1. Open the project folder

```bash
cd /home/nithin/collegebites
```

On Windows, use the path where the project is located.

### 2. Create and activate a virtual environment

Linux / macOS:

```bash
python3 -m venv venv
source venv/bin/activate
```

Windows PowerShell:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Windows Command Prompt:

```cmd
python -m venv venv
venv\Scripts\activate.bat
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

The project requires:

- `Flask`
- `mysql-connector-python`
- `python-dotenv`

### 4. Create the database

Start MySQL, then log in as an administrative user:

```bash
mysql -u root -p
```

Run:

```sql
CREATE DATABASE IF NOT EXISTS collegebites
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'collegebites_user'@'localhost'
  IDENTIFIED BY 'your_password';

GRANT ALL PRIVILEGES ON collegebites.*
  TO 'collegebites_user'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

### 5. Import the schema

From the project folder:

```bash
mysql -u root -p collegebites < schema.sql
```

You can also import `schema.sql` using phpMyAdmin:

1. Open phpMyAdmin.
2. Create a database named `collegebites`.
3. Select the database.
4. Open the **Import** tab.
5. Choose `schema.sql` and click **Import**.

### 6. Configure environment variables

Copy the example file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=collegebites
DB_USER=collegebites_user
DB_PASSWORD=your_password
```

If you are using a default XAMPP or local MySQL setup with the root account, you can use:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=collegebites
DB_USER=root
DB_PASSWORD=
```

The `.env` file is ignored by Git and should not be committed.

### 7. Start the Flask application

```bash
python app.py
```

The app starts on:

```text
http://127.0.0.1:5000/
```

### 8. Open the application

| Page | URL |
| --- | --- |
| Food menu | http://127.0.0.1:5000/ |
| Cart and checkout | http://127.0.0.1:5000/cart |
| Orders dashboard | http://127.0.0.1:5000/orders |
| Health check | http://127.0.0.1:5000/health |

---

## How to Use

### Student flow

1. Open the food menu.
2. Search for a dish or select a category.
3. Click **Add +** on available dishes.
4. Open **My Cart** from the navigation bar.
5. Adjust quantities or remove items.
6. Enter your name and optional contact details.
7. Click **Place Order**.
8. You are redirected to the orders page to track the status.

### Canteen staff flow

1. Open **Manage Orders**.
2. Use the status filters to view pending, preparing, ready, or completed orders.
3. Review the customer details, ordered items, and total.
4. Click **Mark Preparing**, **Mark Ready**, then **Mark Completed** as the order progresses.

---

## Troubleshooting

### `ERR_CONNECTION_REFUSED` at `127.0.0.1:5000`

The Flask server is not running or is listening on another port.

```bash
cd /home/nithin/collegebites
python app.py
```

Check the listener:

```bash
ss -ltnp | grep 5000
```

### `Access denied for user`

The database username or password in `.env` is incorrect, or the user does not have access to the `collegebites` database.

```sql
SHOW GRANTS FOR 'collegebites_user'@'localhost';
```

### `Unknown database 'collegebites'`

Create the database and import the schema:

```bash
mysql -u root -p -e "CREATE DATABASE collegebites;"
mysql -u root -p collegebites < schema.sql
```

### `Address already in use`

Another process is using port 5000. Stop it or start Flask on a different port:

```bash
flask --app app run --port 5001
```

### Health check returns `503`

The Flask server is running but cannot connect to MySQL. Check that MySQL is running and that the `.env` credentials are correct.

```bash
mysqladmin ping
```

### Menu page is empty

The menu API could not load data. Check the Flask server logs and confirm that `menu_items` contains rows:

```sql
SELECT * FROM collegebites.menu_items;
```

---

## Verification Checklist

The implemented application has been tested for:

- Menu page, cart page, and orders page rendering.
- Menu API returning seeded items.
- Order creation with server-calculated totals.
- Invalid order requests being rejected.
- Order listing and single-order retrieval.
- Status transitions from `Pending` to `Completed`.
- Invalid backward status transitions returning `409`.
- Status filtering on the orders API.
- Health check reporting the database connection.
- Schema import running safely more than once without duplicating seed data.
- JavaScript files passing syntax checks.
- All pages and static assets returning HTTP `200`.

---

## Notes

- This project uses the Flask development server. For production deployment, use a production WSGI server such as Gunicorn or Waitress behind a reverse proxy.
- Payment is handled at the canteen counter; the application currently manages ordering and order status only.
- Cart data is stored in the browser. Order data is stored in MySQL.
