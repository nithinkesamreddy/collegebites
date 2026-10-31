from decimal import Decimal

from flask import Flask, jsonify, render_template, request

from database import get_db_connection

app = Flask(__name__)

ORDER_STATUSES = ("Pending", "Preparing", "Ready", "Completed")
NEXT_STATUS = {
    "Pending": "Preparing",
    "Preparing": "Ready",
    "Ready": "Completed",
}
MAX_ITEM_QUANTITY = 50


def serialize_order(order, items):
    return {
        "id": order["id"],
        "customer_name": order["customer_name"],
        "customer_contact": order["customer_contact"],
        "total_amount": float(order["total_amount"]),
        "status": order["status"],
        "created_at": order["created_at"].strftime("%Y-%m-%dT%H:%M:%S"),
        "items": [
            {
                "id": item["id"],
                "menu_item_id": item["menu_item_id"],
                "name": item["item_name"],
                "quantity": int(item["quantity"]),
                "unit_price": float(item["unit_price"]),
                "subtotal": float(item["subtotal"]),
            }
            for item in items
        ],
    }


def fetch_order(cursor, order_id):
    cursor.execute(
        """
        SELECT id, customer_name, customer_contact, total_amount,
               status, created_at
        FROM orders
        WHERE id = %s
        """,
        (order_id,),
    )
    order = cursor.fetchone()

    if not order:
        return None

    cursor.execute(
        """
        SELECT id, menu_item_id, item_name, quantity, unit_price, subtotal
        FROM order_items
        WHERE order_id = %s
        ORDER BY id
        """,
        (order_id,),
    )

    return serialize_order(order, cursor.fetchall())


def parse_order_items(raw_items):
    if not isinstance(raw_items, list) or not raw_items:
        raise ValueError("Your cart is empty.")

    quantities = {}

    for raw_item in raw_items:
        if not isinstance(raw_item, dict):
            raise ValueError("Each cart item must be an object.")

        try:
            menu_item_id = int(raw_item.get("menu_item_id"))
            quantity = int(raw_item.get("quantity", 1))
        except (TypeError, ValueError):
            raise ValueError("Each cart item needs a valid menu item and quantity.")

        if isinstance(raw_item.get("menu_item_id"), bool) or quantity < 1:
            raise ValueError("Quantity must be a positive number.")

        quantities[menu_item_id] = quantities.get(menu_item_id, 0) + quantity

        if quantities[menu_item_id] > MAX_ITEM_QUANTITY:
            raise ValueError(
                f"Maximum quantity is {MAX_ITEM_QUANTITY} per item."
            )

    return quantities


@app.get("/")
def menu_page():
    return render_template("menu.html", active_page="menu")


@app.get("/cart")
def cart_page():
    return render_template("cart.html", active_page="cart")


@app.get("/orders")
def orders_page():
    return render_template("orders.html", active_page="orders")


@app.get("/api/menu")
def get_menu():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, name, category, description,
                   price, image_url, available
            FROM menu_items
            ORDER BY category, name
            """
        )

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


@app.get("/api/orders")
def get_orders():
    connection = None
    cursor = None

    try:
        status = request.args.get("status")

        if status and status not in ORDER_STATUSES:
            return jsonify({"error": "Unknown order status."}), 400

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        if status:
            cursor.execute(
                """
                SELECT id, customer_name, customer_contact, total_amount,
                       status, created_at
                FROM orders
                WHERE status = %s
                ORDER BY created_at DESC, id DESC
                """,
                (status,),
            )
        else:
            cursor.execute(
                """
                SELECT id, customer_name, customer_contact, total_amount,
                       status, created_at
                FROM orders
                ORDER BY created_at DESC, id DESC
                """
            )

        orders = cursor.fetchall()

        if not orders:
            return jsonify([])

        order_ids = [order["id"] for order in orders]
        placeholders = ", ".join(["%s"] * len(order_ids))

        cursor.execute(
            f"""
            SELECT order_id, id, menu_item_id, item_name, quantity,
                   unit_price, subtotal
            FROM order_items
            WHERE order_id IN ({placeholders})
            ORDER BY id
            """,
            tuple(order_ids),
        )

        items_by_order = {order_id: [] for order_id in order_ids}

        for item in cursor.fetchall():
            items_by_order[item["order_id"]].append(item)

        return jsonify(
            [
                serialize_order(order, items_by_order[order["id"]])
                for order in orders
            ]
        )

    except Exception:
        app.logger.exception("Failed to load orders")
        return jsonify({"error": "Unable to load orders"}), 500

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.get("/api/orders/<int:order_id>")
def get_order(order_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        order = fetch_order(cursor, order_id)

        if not order:
            return jsonify({"error": "Order not found."}), 404

        return jsonify(order)

    except Exception:
        app.logger.exception("Failed to load order %s", order_id)
        return jsonify({"error": "Unable to load order"}), 500

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.post("/api/orders")
def create_order():
    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({"error": "Send order details as JSON."}), 400

    customer_name = str(payload.get("customer_name", "")).strip()
    customer_contact = str(payload.get("customer_contact", "")).strip()

    if not customer_name:
        return jsonify({"error": "Customer name is required."}), 400

    if len(customer_name) > 100:
        return jsonify({"error": "Customer name is too long."}), 400

    if len(customer_contact) > 30:
        return jsonify({"error": "Customer contact is too long."}), 400

    try:
        quantities = parse_order_items(payload.get("items"))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        menu_ids = tuple(quantities.keys())
        placeholders = ", ".join(["%s"] * len(menu_ids))

        cursor.execute(
            f"""
            SELECT id, name, price, available
            FROM menu_items
            WHERE id IN ({placeholders})
            """,
            menu_ids,
        )

        menu_items = {item["id"]: item for item in cursor.fetchall()}
        missing = [menu_id for menu_id in menu_ids if menu_id not in menu_items]

        if missing:
            return jsonify({"error": "One or more cart items no longer exist."}), 400

        unavailable = [
            menu_items[menu_id]["name"]
            for menu_id in menu_ids
            if not menu_items[menu_id]["available"]
        ]

        if unavailable:
            return jsonify(
                {
                    "error": (
                        "Currently unavailable: "
                        + ", ".join(unavailable)
                        + "."
                    )
                }
            ), 400

        total_amount = sum(
            (
                Decimal(menu_items[menu_id]["price"]) * quantity
                for menu_id, quantity in quantities.items()
            ),
            Decimal("0.00"),
        )

        cursor.execute(
            """
            INSERT INTO orders (customer_name, customer_contact, total_amount, status)
            VALUES (%s, %s, %s, %s)
            """,
            (
                customer_name,
                customer_contact or None,
                total_amount,
                "Pending",
            ),
        )

        order_id = cursor.lastrowid

        line_items = []

        for menu_id, quantity in quantities.items():
            menu_item = menu_items[menu_id]
            unit_price = Decimal(menu_item["price"])
            line_items.append(
                (
                    order_id,
                    menu_id,
                    menu_item["name"],
                    quantity,
                    unit_price,
                    unit_price * quantity,
                )
            )

        cursor.executemany(
            """
            INSERT INTO order_items (
                order_id, menu_item_id, item_name,
                quantity, unit_price, subtotal
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            line_items,
        )

        connection.commit()

        return jsonify(fetch_order(cursor, order_id)), 201

    except Exception:
        if connection:
            connection.rollback()
        app.logger.exception("Failed to create order")
        return jsonify({"error": "Unable to place order"}), 500

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.patch("/api/orders/<int:order_id>/status")
def update_order_status(order_id):
    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({"error": "Send a status as JSON."}), 400

    new_status = payload.get("status")

    if new_status not in ORDER_STATUSES:
        return jsonify({"error": "Unknown order status."}), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT id, status FROM orders WHERE id = %s",
            (order_id,),
        )
        order = cursor.fetchone()

        if not order:
            return jsonify({"error": "Order not found."}), 404

        current_status = order["status"]

        if current_status == new_status:
            return jsonify(fetch_order(cursor, order_id))

        if NEXT_STATUS.get(current_status) != new_status:
            return jsonify(
                {
                    "error": (
                        f"Order cannot move from {current_status} "
                        f"to {new_status}."
                    )
                }
            ), 409

        cursor.execute(
            "UPDATE orders SET status = %s WHERE id = %s",
            (new_status, order_id),
        )
        connection.commit()

        return jsonify(fetch_order(cursor, order_id))

    except Exception:
        if connection:
            connection.rollback()
        app.logger.exception("Failed to update order %s", order_id)
        return jsonify({"error": "Unable to update order"}), 500

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.get("/health")
def health():
    connection = None

    try:
        connection = get_db_connection()
        connection.ping(reconnect=False)
        return jsonify({"status": "ok", "database": "connected"})
    except Exception:
        app.logger.exception("Health check failed")
        return jsonify({"status": "error", "database": "unavailable"}), 503
    finally:
        if connection and connection.is_connected():
            connection.close()


if __name__ == "__main__":
    app.run(debug=True)
