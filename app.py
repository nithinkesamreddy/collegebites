
from flask import Flask, jsonify, render_template
from database import get_db_connection

app = Flask(__name__)


@app.get("/")
def menu_page():
    return render_template("menu.html")


@app.get("/api/menu")
def get_menu():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, name, category, description,
                   price, image_url, available
            FROM menu_items
            ORDER BY category, name
        """)

        items = cursor.fetchall()

        for item in items:
            item["price"] = float(item["price"])
            item["available"] = bool(item["available"])

        return jsonify(items)

    except Exception:
        app.logger.exception("Failed to load menu")
        return jsonify({"error": "Unable to load menu"}), 500

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True)
