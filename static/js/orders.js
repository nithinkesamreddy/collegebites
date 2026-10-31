const {
    formatCurrency,
    showToast
} = window.CampusBite;

const ordersList = document.getElementById("orders-list");
const ordersMessage = document.getElementById("orders-message");
const statusFilters = document.getElementById("status-filters");
const orderBanner = document.getElementById("order-banner");
const refreshButton = document.getElementById("refresh-orders");

const STATUSES = ["All", "Pending", "Preparing", "Ready", "Completed"];
const NEXT_STATUS = {
    Pending: "Preparing",
    Preparing: "Ready",
    Ready: "Completed"
};

const params = new URLSearchParams(window.location.search);
const placedOrderId = Number(params.get("placed")) || null;

let orders = [];
let selectedStatus = "All";
let placedOrderHandled = false;

function element(tag, className, text) {
    const node = document.createElement(tag);

    if (className) {
        node.className = className;
    }

    if (text !== undefined) {
        node.textContent = text;
    }

    return node;
}

function showMessage(message, type = "info") {
    ordersMessage.textContent = message;
    ordersMessage.className = `alert alert-${type}`;
    ordersMessage.hidden = false;
}

function hideMessage() {
    ordersMessage.hidden = true;
}

function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function renderFilters() {
    statusFilters.replaceChildren();

    STATUSES.forEach(status => {
        const count = status === "All"
            ? orders.length
            : orders.filter(order => order.status === status).length;

        const button = element("button", "filter");
        button.type = "button";
        button.append(
            document.createTextNode(status),
            element("span", "filter-count", String(count))
        );

        if (status === selectedStatus) {
            button.classList.add("active");
        }

        button.addEventListener("click", () => {
            selectedStatus = status;
            renderFilters();
            renderOrders();
        });

        statusFilters.appendChild(button);
    });
}

function buildOrderCard(order) {
    const card = element("article", "order-card");
    card.dataset.orderId = order.id;

    const header = element("header", "order-header");

    const heading = element("div");
    heading.appendChild(element("h2", null, `Order #${order.id}`));

    const metaParts = [
        order.customer_name,
        order.customer_contact,
        formatDate(order.created_at)
    ].filter(Boolean);

    heading.appendChild(element("p", "order-meta", metaParts.join(" · ")));

    const badge = element(
        "span",
        `status-badge status-${order.status.toLowerCase()}`,
        order.status
    );

    header.append(heading, badge);

    const itemList = element("ul", "order-items");

    order.items.forEach(item => {
        const row = element("li");
        row.append(
            element(
                "span",
                null,
                `${item.quantity} × ${item.name}`
            ),
            element("span", null, formatCurrency(item.subtotal))
        );
        itemList.appendChild(row);
    });

    const footer = element("footer", "order-footer");

    const total = element("div", "order-total");
    total.append(
        element("span", "order-total-label", "Total"),
        element("strong", null, formatCurrency(order.total_amount))
    );

    const actions = element("div", "order-actions");
    const nextStatus = NEXT_STATUS[order.status];

    if (nextStatus) {
        const button = element(
            "button",
            "btn btn-primary btn-small",
            `Mark ${nextStatus}`
        );
        button.type = "button";
        button.addEventListener("click", () => {
            updateOrderStatus(order.id, nextStatus, button);
        });
        actions.appendChild(button);
    } else {
        actions.appendChild(
            element("span", "order-done", "Order completed ✓")
        );
    }

    footer.append(total, actions);
    card.append(header, itemList, footer);

    return card;
}

function renderOrders() {
    const filtered = selectedStatus === "All"
        ? orders
        : orders.filter(order => order.status === selectedStatus);

    ordersList.replaceChildren();

    if (filtered.length === 0) {
        const empty = element("div", "empty-state");
        empty.append(
            element("h2", null, "No orders here"),
            element(
                "p",
                null,
                selectedStatus === "All"
                    ? "Orders placed from the cart will appear here."
                    : `There are no ${selectedStatus.toLowerCase()} orders.`
            ),
            (() => {
                const link = element("a", "btn btn-primary", "Browse menu");
                link.href = "/";
                return link;
            })()
        );
        ordersList.appendChild(empty);
        return;
    }

    filtered.forEach(order => {
        ordersList.appendChild(buildOrderCard(order));
    });
}

async function updateOrderStatus(orderId, status, button) {
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = "Updating...";

    try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || "Unable to update order.");
        }

        showToast(`Order #${orderId} marked ${status}`);
        await loadOrders({ silent: true });
    } catch (error) {
        showToast(error.message, "error");
        button.disabled = false;
        button.textContent = originalLabel;
    }
}

async function loadOrders({ silent = false } = {}) {
    if (!silent) {
        showMessage("Loading orders...", "info");
    }

    try {
        const response = await fetch("/api/orders");
        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                (data && data.error) || "Unable to load orders."
            );
        }

        if (!Array.isArray(data)) {
            throw new Error("Unexpected response from the server.");
        }

        orders = data;
        renderFilters();
        renderOrders();
        hideMessage();

        if (placedOrderId && !placedOrderHandled) {
            placedOrderHandled = true;
            const placedOrder = orders.find(order => order.id === placedOrderId);

            if (placedOrder) {
                orderBanner.textContent =
                    `Order #${placedOrderId} placed successfully. ` +
                    "The canteen will start preparing it soon.";
                orderBanner.hidden = false;

                const card = ordersList.querySelector(
                    `[data-order-id="${placedOrderId}"]`
                );

                if (card) {
                    card.classList.add("highlight");
                }

                window.setTimeout(() => {
                    orderBanner.hidden = true;
                }, 6000);
            }

            window.history.replaceState({}, "", "/orders");
        }
    } catch (error) {
        showMessage(error.message, "error");
    }
}

refreshButton.addEventListener("click", () => {
    loadOrders();
});

window.setInterval(() => {
    if (!document.hidden) {
        loadOrders({ silent: true });
    }
}, 30000);

loadOrders();
