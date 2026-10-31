window.CampusBite = (() => {
    const CART_KEY = "collegebites_cart";
    const LEGACY_CART_KEY = "campusbite_cart";
    const MAX_ITEM_QUANTITY = 50;

    function parseCart(raw) {
        try {
            const parsed = JSON.parse(raw || "[]");

            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed
                .map(item => ({
                    menu_item_id: Number(item.menu_item_id),
                    name: String(item.name || "Menu item"),
                    price: Number(item.price) || 0,
                    quantity: Math.min(
                        MAX_ITEM_QUANTITY,
                        Math.max(1, Number.parseInt(item.quantity, 10) || 1)
                    )
                }))
                .filter(item => Number.isFinite(item.menu_item_id));
        } catch {
            return [];
        }
    }

    function getCart() {
        const current = localStorage.getItem(CART_KEY);

        if (current !== null) {
            return parseCart(current);
        }

        const legacy = localStorage.getItem(LEGACY_CART_KEY);

        if (legacy !== null) {
            localStorage.setItem(CART_KEY, legacy);
            localStorage.removeItem(LEGACY_CART_KEY);
            return parseCart(legacy);
        }

        return [];
    }

    function cartQuantity() {
        return getCart().reduce((sum, item) => sum + item.quantity, 0);
    }

    function updateCartBadge() {
        const quantity = cartQuantity();

        document.querySelectorAll("[data-cart-count]").forEach(badge => {
            badge.textContent = quantity;
        });
    }

    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        updateCartBadge();
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2
        }).format(Number(value) || 0);
    }

    function showToast(message, type = "success") {
        let container = document.getElementById("toast-container");

        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            container.className = "toast-container";
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add("show"));

        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, 2600);
    }

    window.addEventListener("storage", event => {
        if (event.key === CART_KEY || event.key === LEGACY_CART_KEY) {
            updateCartBadge();
        }
    });

    document.addEventListener("DOMContentLoaded", updateCartBadge);

    return {
        CART_KEY,
        MAX_ITEM_QUANTITY,
        getCart,
        saveCart,
        cartQuantity,
        updateCartBadge,
        formatCurrency,
        showToast
    };
})();
