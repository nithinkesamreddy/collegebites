
from flask import Flask, jsonify, render_template, request
from database import get_db_connection

app = Flask(__name__)


# ── Page Routes ────────────────────────────────────────────────────────────────

@app.get("/")
def menu_page():
    return render_template("menu.html")


@app.get("/cart")
def cart_page():
    return render_template("cart.html")


@app.get("/orders")
def orders_page():
    return render_template("orders.html")


# ── API: Menu ──────────────────────────────────────────────────────────────────

@app.get("/api/menu")
def get_menu():
    connection = cursor = None
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
            item["price"]     = float(item["price"])
            item["available"] = bool(item["available"])
        return jsonify(items)
    except Exception:
        app.logger.exception("Failed to load menu")
        return jsonify({"error": "Unable to load menu"}), 500
    finally:
        if cursor:     cursor.close()
        if connection and connection.is_connected(): connection.close()


# ── API: Place Order ───────────────────────────────────────────────────────────

@app.post("/api/orders")
def place_order():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    customer_name    = (data.get("customer_name") or "").strip()
    customer_contact = (data.get("customer_contact") or "").strip()
    items            = data.get("items") or []

    if not customer_name:
        return jsonify({"error": "customer_name is required"}), 400
    if not items:
        return jsonify({"error": "items list is required"}), 400

    # Validate items list structure
    for entry in items:
        if not isinstance(entry.get("menu_item_id"), int) or \
           not isinstance(entry.get("quantity"), int) or \
           entry["quantity"] < 1:
            return jsonify({"error": "Invalid item in order"}), 400

    connection = cursor = None
    try:
        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)

        # Fetch real prices from DB — never trust client prices
        ids = [e["menu_item_id"] for e in items]
        fmt = ",".join(["%s"] * len(ids))
        cursor.execute(
            f"SELECT id, name, price, available FROM menu_items WHERE id IN ({fmt})",
            ids
        )
        db_items = {row["id"]: row for row in cursor.fetchall()}

        # Validate all items exist and are available
        order_lines = []
        total       = 0.0
        for entry in items:
            mid = entry["menu_item_id"]
            qty = entry["quantity"]
            row = db_items.get(mid)
            if not row:
                return jsonify({"error": f"Menu item {mid} not found"}), 404
            if not row["available"]:
                return jsonify({"error": f"'{row['name']}' is currently unavailable"}), 409
            unit_price = float(row["price"])
            subtotal   = round(unit_price * qty, 2)
            total     += subtotal
            order_lines.append({
                "menu_item_id": mid,
                "item_name":    row["name"],
                "quantity":     qty,
                "unit_price":   unit_price,
                "subtotal":     subtotal,
            })

        total = round(total, 2)

        # Insert order
        cursor.execute(
            """INSERT INTO orders (customer_name, customer_contact, total_amount, status)
               VALUES (%s, %s, %s, 'Pending')""",
            (customer_name, customer_contact, total)
        )
        order_id = cursor.lastrowid

        # Insert order items
        for line in order_lines:
            cursor.execute(
                """INSERT INTO order_items
                   (order_id, menu_item_id, item_name, quantity, unit_price, subtotal)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (order_id, line["menu_item_id"], line["item_name"],
                 line["quantity"], line["unit_price"], line["subtotal"])
            )

        connection.commit()
        return jsonify({"order_id": order_id, "total": total}), 201

    except Exception:
        app.logger.exception("Failed to place order")
        if connection:
            try: connection.rollback()
            except Exception: pass
        return jsonify({"error": "Failed to place order"}), 500
    finally:
        if cursor:     cursor.close()
        if connection and connection.is_connected(): connection.close()


# ── API: List Orders ───────────────────────────────────────────────────────────

@app.get("/api/orders")
def list_orders():
    connection = cursor = None
    try:
        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, customer_name, customer_contact,
                   total_amount, status, created_at
            FROM orders
            ORDER BY created_at DESC
        """)
        orders = cursor.fetchall()

        for o in orders:
            o["total_amount"] = float(o["total_amount"])
            if o["created_at"]:
                o["created_at"] = o["created_at"].isoformat()

        if not orders:
            return jsonify([])

        # Fetch order items for all orders in one query
        order_ids = [o["id"] for o in orders]
        fmt = ",".join(["%s"] * len(order_ids))
        cursor.execute(
            f"""SELECT order_id, item_name, quantity, subtotal
                FROM order_items WHERE order_id IN ({fmt})""",
            order_ids
        )
        items_rows = cursor.fetchall()

        # Group items by order_id
        items_map = {}
        for row in items_rows:
            row["subtotal"] = float(row["subtotal"])
            items_map.setdefault(row["order_id"], []).append(row)

        for o in orders:
            o["items"] = items_map.get(o["id"], [])

        return jsonify(orders)

    except Exception:
        app.logger.exception("Failed to list orders")
        return jsonify({"error": "Unable to load orders"}), 500
    finally:
        if cursor:     cursor.close()
        if connection and connection.is_connected(): connection.close()


# ── API: Update Order Status ───────────────────────────────────────────────────

VALID_STATUSES = ("Pending", "Preparing", "Ready", "Completed")

@app.route("/api/orders/<int:order_id>/status", methods=["PATCH"])
def update_order_status(order_id):
    data   = request.get_json(silent=True)
    status = (data or {}).get("status", "").strip()

    if status not in VALID_STATUSES:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"}), 400

    connection = cursor = None
    try:
        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)

        cursor.execute("SELECT id, status FROM orders WHERE id = %s", (order_id,))
        order = cursor.fetchone()
        if not order:
            return jsonify({"error": "Order not found"}), 404

        cursor.execute(
            "UPDATE orders SET status = %s WHERE id = %s",
            (status, order_id)
        )
        connection.commit()
        return jsonify({"order_id": order_id, "status": status})

    except Exception:
        app.logger.exception("Failed to update order status")
        if connection:
            try: connection.rollback()
            except Exception: pass
        return jsonify({"error": "Failed to update status"}), 500
    finally:
        if cursor:     cursor.close()
        if connection and connection.is_connected(): connection.close()


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True)
