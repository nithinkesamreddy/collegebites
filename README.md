# CollegeBites 🍽️

CollegeBites is a college canteen ordering platform developed with Python, Flask, and MySQL. It provides students with a fast and intuitive way to explore daily canteen meals, filter by category, search dishes in real time, and add items to their cart.

---

## 📌 Project Overview

- **Purpose**: Modernize campus canteen operations by offering a digital food menu and ordering platform.
- **Core Architecture**: Lightweight Flask backend serving server-rendered HTML alongside RESTful JSON API endpoints connected to a relational MySQL database.
- **Storage Policy**: Uses **MySQL only** for relational data persistence.

---

## 🛠️ Technologies Used

### Backend
- **Python 3**: Core programming language.
- **Flask**: Lightweight web framework for routing, template rendering, and REST API endpoints.
- **mysql-connector-python**: Official MySQL driver for database queries and connection management.
- **python-dotenv**: Environment variable management for secure database credentials.

### Frontend
- **HTML5**: Semantic markup with Jinja2 templating.
- **CSS3**: Responsive modern styling with flexbox, grid, and card layouts.
- **JavaScript (ES6+)**: Vanilla client-side script handling asynchronous requests (`fetch`), live search filtering, and shopping cart persistence via `localStorage`.

### Database
- **MySQL**: Relational database storing menu items, orders, and order items.

---

## ✨ Implemented Features

1. **Interactive Food Menu**:
   - Displays dish cards with name, category, description, price (₹), and availability status.
   - Dishes marked unavailable are visibly disabled to prevent ordering.
2. **Real-Time Food Search**:
   - Instantly filters dishes by name or category as the user types in the search bar without reloading the page.
3. **Dynamic Category Filtering**:
   - One-click category buttons (`All`, `Breakfast`, `Meals`, `Snacks`, `Drinks`) dynamically generated from menu data.
4. **Client-Side Cart Management**:
   - Add items to cart with quantity tracking (up to 50 items per dish).
   - Dynamic cart badge in the navigation bar synced across page sessions using browser `localStorage`.
5. **Backend REST API**:
   - `GET /`: Renders the main canteen food menu webpage.
   - `GET /api/menu`: Fetches all menu items from MySQL, returning structured JSON.
   - `GET /health`: Health-check route returning operational status `{"status": "ok"}`.
6. **Relational MySQL Database Schema**:
   - `menu_items`: Stores catalog dishes, pricing, and availability. Includes 6 initial seed items.
   - `orders`: Tracks order lifecycle statuses (`Pending`, `Preparing`, `Ready`, `Completed`).
   - `order_items`: Maps line items to orders with foreign keys, unit pricing, and cascade deletion.

---

## 📂 Project Structure

```text
collegebites/
├── static/
│   ├── css/
│   │   └── style.css          # Main stylesheet for layout and UI components
│   └── js/
│       └── menu.js            # Client-side API fetch, live search, and cart logic
├── templates/
│   └── menu.html              # HTML template for the food menu page
├── app.py                     # Flask application entry point and route definitions
├── database.py                # MySQL connection management logic
├── requirements.txt           # Python package dependencies
├── schema.sql                 # MySQL table definitions and seed data
└── README.md                  # Project documentation
```

---

## ⚙️ Installation & Setup (Local Environment)

### 1. Prerequisites
- **Python 3.8 or higher**: [Download Python](https://www.python.org/downloads/)
- **MySQL Server**: Installed via [XAMPP](https://www.apachefriends.org/) or standalone MySQL Server.

---

### 2. Clone or Open the Project
Open a terminal in your project directory:
```bash
cd "C:\Users\kodur\OneDrive\Documents\collegebites"
```

---

### 3. Create and Activate a Virtual Environment
```bash
# Windows PowerShell
python -m venv venv
.\venv\Scripts\Activate.ps1

# Windows Command Prompt (CMD)
python -m venv venv
.\venv\Scripts\activate.bat
```

---

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

Packages installed:
- `Flask`
- `mysql-connector-python`
- `python-dotenv`

---

## 🗄️ Database Setup (MySQL)

### Step 1: Start MySQL Service
- Open the **XAMPP Control Panel**.
- Click **Start** next to **MySQL** (and **Apache** if using phpMyAdmin).

### Step 2: Create the Database & Tables
You can set up the database using either **phpMyAdmin** or the **MySQL Command Line**:

#### Option A: Using phpMyAdmin (Web Browser)
1. Open your browser and go to `http://localhost/phpmyadmin`.
2. Click **New** on the left sidebar.
3. Enter database name: `collegebites` and click **Create**.
4. Select the newly created `collegebites` database.
5. Click on the **Import** tab at the top.
6. Choose the `schema.sql` file from your project folder and click **Import** (or paste the contents of `schema.sql` into the **SQL** tab and click **Go**).

#### Option B: Using MySQL Command Line
```bash
mysql -u root -p
```
*(Press Enter if no password is set).*

Then execute:
```sql
CREATE DATABASE IF NOT EXISTS collegebites;
USE collegebites;
SOURCE C:/Users/kodur/OneDrive/Documents/collegebites/schema.sql;
```

---

### Step 3: Configure Environment Variables
Create a file named `.env` in the project root directory (next to `app.py`) with your MySQL connection settings:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=collegebites
DB_PORT=3306
```

*(Note: For default XAMPP setups, `DB_USER` is `root` and `DB_PASSWORD` is left blank).*

---

## 🚀 Running the Application

1. Make sure your virtual environment is active.
2. Start the Flask application:
   ```bash
   python app.py
   ```
3. Open your web browser and visit:
   ```
   http://127.0.0.1:5000/
   ```
4. Verify the backend health check endpoint:
   ```
   http://127.0.0.1:5000/health
   ```

---

## 🌐 Deploying & Sharing a Public Link

To obtain a shareable public URL with your MySQL database:

### Method 1: Permanent 24/7 Cloud Hosting (PythonAnywhere)
PythonAnywhere includes free Python hosting and a **free MySQL database** on the same dashboard without requiring a credit card:
1. Register for a free account at [pythonanywhere.com](https://www.pythonanywhere.com/).
2. Under the **Databases** tab, initialize a MySQL database and run `schema.sql`.
3. Under the **Files** tab, upload the project files.
4. Under the **Web** tab, configure the WSGI file to load `app.py`.
5. Access your live website at: `https://<your-username>.pythonanywhere.com`.

### Method 2: Instant Public Demo Link (ngrok Tunnel)
To share a live link directly from your laptop while running XAMPP and Flask:
1. Start Flask locally: `python app.py`.
2. In a separate terminal, run:
   ```bash
   ngrok http 5000
   ```
3. Share the generated public URL (`https://<random-id>.ngrok-free.app`).

---

## 📄 License
This project is developed for educational and campus canteen management purposes.
