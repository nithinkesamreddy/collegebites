# CollegeBites 🍽️

A Flask-based college canteen menu API with a MySQL backend.

---

## Prerequisites

- Python 3.10+
- MySQL Server 8.0+

---

## Setup Instructions

### 1. Install MySQL Server (if not installed)
```bash
sudo apt-get update
sudo apt-get install -y mysql-server mysql-client
sudo systemctl start mysql
sudo systemctl enable mysql
```

### 2. Create a Python Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Set Up the MySQL Database
```bash
sudo mysql -u root
```
Then in the MySQL shell:
```sql
CREATE DATABASE campusbite_db;
CREATE USER 'campusbite_user'@'localhost' IDENTIFIED BY 'your_password_here';
GRANT ALL PRIVILEGES ON campusbite_db.* TO 'campusbite_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Load the schema and seed data:
```bash
mysql -u campusbite_user -p campusbite_db < schema.sql
```

### 4. Configure Environment Variables
Edit the `.env` file in the project root:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=campusbite_db
DB_USER=campusbite_user
DB_PASSWORD=your_password_here
```

### 5. Run the App
```bash
source venv/bin/activate
python app.py
```

The server will start at **http://127.0.0.1:5000**

---

## API Endpoints

| Method | Endpoint    | Description               |
|--------|-------------|---------------------------|
| GET    | `/`         | Menu HTML page            |
| GET    | `/api/menu` | JSON list of menu items   |
| GET    | `/health`   | Health check              |

---

## Project Structure

```
collegebites/
├── app.py           # Flask routes
├── database.py      # DB connection helper
├── schema.sql       # DB schema + seed data
├── requirements.txt # Python dependencies
├── .env             # Environment variables (not committed)
├── static/          # CSS, JS, images
└── templates/       # Jinja2 HTML templates
```
