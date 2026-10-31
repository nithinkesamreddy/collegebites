const {
    MAX_ITEM_QUANTITY,
    getCart,
    saveCart,
    updateCartBadge,
    formatCurrency,
    showToast
} = window.CampusBite;

const cartItems = document.getElementById("cart-items");
const cartEmpty = document.getElementById("cart-empty");
const cartMessage = document.getElementById("cart-message");
const summaryItems = document.getElementById("summary-items");
const summarySubtotal = document.getElementById("summary-subtotal");
const summaryTotal = document.getElementById("summary-total");
const checkoutForm = document.getElementById("checkout-form");
const nameInput = document.getElementById("customer-name");
const contactInput = document.getElementById("customer-contact");
const placeOrderButton = document.getElementById("place-order");
const clearCartButton = document.getElementById("clear-cart");

function showMessage(message, type = "info") {
    cartMessage.textContent = message;
    cartMessage.className = `alert alert-${type}`;
    cartMessage.hidden = false;
}

function hideMessage() {
    cartMessage.hidden = true;
}

function buildCartItem(item) {
    const row = document.createElement("article");
    row.className = "cart-item";
    row.dataset.cartId = item.menu_item_id;

    const image = document.createElement("div");
    image.className = "cart-item-image";
    image.textContent = "🍽️";

    const info = document.createElement("div");
    info.className = "cart-item-info";

    const name = document.createElement("h3");
    name.textContent = item.name;

    const unitPrice = document.createElement("p");
    unitPrice.textContent = `${formatCurrency(item.price)} each`;

    info.append(name, unitPrice);

    const quantityControls = document.createElement("div");
    quantityControls.className = "qty-controls";

    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.dataset.action = "decrease";
    decrease.setAttribute("aria-label", `Decrease ${item.name} quantity`);
    decrease.textContent = "−";

    const quantity = document.createElement("span");
    quantity.textContent = item.quantity;

    const increase = document.createElement("button");
    increase.type = "button";
    increase.dataset.action = "increase";
    increase.setAttribute("aria-label", `Increase ${item.name} quantity`);
    increase.textContent = "+";

    quantityControls.append(decrease, quantity, increase);

    const lineTotal = document.createElement("strong");
    lineTotal.className = "cart-item-total";
    lineTotal.textContent = formatCurrency(item.price * item.quantity);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-item";
    remove.dataset.action = "remove";
    remove.textContent = "Remove";

    row.append(image, info, quantityControls, lineTotal, remove);

    return row;
}

function renderCart() {
    const cart = getCart();
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    cartItems.replaceChildren();

    if (cart.length === 0) {
        cartItems.hidden = true;
        cartEmpty.hidden = false;
    } else {
        cartItems.hidden = false;
        cartEmpty.hidden = true;

        cart.forEach(item => {
            cartItems.appendChild(buildCartItem(item));
        });
    }

    summaryItems.textContent = totalQuantity;
    summarySubtotal.textContent = formatCurrency(subtotal);
    summaryTotal.textContent = formatCurrency(subtotal);

    placeOrderButton.disabled = cart.length === 0;
    clearCartButton.disabled = cart.length === 0;

    updateCartBadge();
}

function updateQuantity(menuItemId, change) {
    const cart = getCart();
    const item = cart.find(entry => entry.menu_item_id === menuItemId);

    if (!item) {
        return;
    }

    const nextQuantity = item.quantity + change;

    if (nextQuantity > MAX_ITEM_QUANTITY) {
        showToast(
            `Maximum quantity is ${MAX_ITEM_QUANTITY} per item.`,
            "error"
        );
        return;
    }

    if (nextQuantity < 1) {
        removeItem(menuItemId);
        return;
    }

    item.quantity = nextQuantity;
    saveCart(cart);
    renderCart();
}

function removeItem(menuItemId) {
    const cart = getCart().filter(item => item.menu_item_id !== menuItemId);
    saveCart(cart);
    renderCart();
}

cartItems.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const row = button.closest("[data-cart-id]");

    if (!row) {
        return;
    }

    const menuItemId = Number(row.dataset.cartId);

    if (button.dataset.action === "increase") {
        updateQuantity(menuItemId, 1);
    } else if (button.dataset.action === "decrease") {
        updateQuantity(menuItemId, -1);
    } else if (button.dataset.action === "remove") {
        removeItem(menuItemId);
    }
});

clearCartButton.addEventListener("click", () => {
    if (getCart().length === 0) {
        return;
    }

    if (window.confirm("Remove all items from your cart?")) {
        saveCart([]);
        renderCart();
        hideMessage();
        showToast("Cart cleared");
    }
});

checkoutForm.addEventListener("submit", async event => {
    event.preventDefault();

    const cart = getCart();

    if (cart.length === 0) {
        showMessage("Your cart is empty. Add something tasty first.", "error");
        return;
    }

    const customerName = nameInput.value.trim();

    if (!customerName) {
        showMessage("Please enter your name before placing the order.", "error");
        nameInput.focus();
        return;
    }

    const payload = {
        customer_name: customerName,
        customer_contact: contactInput.value.trim(),
        items: cart.map(item => ({
            menu_item_id: item.menu_item_id,
            quantity: item.quantity
        }))
    };

    placeOrderButton.disabled = true;
    placeOrderButton.textContent = "Placing order...";
    hideMessage();

    try {
        const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || "Unable to place order.");
        }

        saveCart([]);
        renderCart();
        showMessage(
            `Order #${data.id} placed successfully. Redirecting to orders...`,
            "success"
        );

        setTimeout(() => {
            window.location.href = `/orders?placed=${data.id}`;
        }, 900);
    } catch (error) {
        showMessage(error.message, "error");
        placeOrderButton.disabled = false;
        placeOrderButton.textContent = "Place Order";
    }
});

renderCart();
