
const menuGrid = document.getElementById("menu-grid");
const menuMessage = document.getElementById("menu-message");
const searchInput = document.getElementById("search-input");
const categoryFilters = document.getElementById("category-filters");
const cartCount = document.getElementById("cart-count");

let menuItems = [];
let selectedCategory = "All";

function getCart() {
    try {
        const cart = JSON.parse(
            localStorage.getItem("campusbite_cart") || "[]"
        );
        return Array.isArray(cart) ? cart : [];
    } catch {
        return [];
    }
}

function updateCartCount() {
    cartCount.textContent = getCart().reduce(
        (sum, item) => sum + item.quantity, 0
    );
}

function renderCategories() {
    const categories = [
        "All",
        ...new Set(menuItems.map(item => item.category))
    ];

    categoryFilters.replaceChildren();

    categories.forEach(category => {
        const button = document.createElement("button");
        button.className = "filter";
        button.textContent = category;

        if (category === selectedCategory) {
            button.classList.add("active");
        }

        button.addEventListener("click", () => {
            selectedCategory = category;
            renderCategories();
            renderMenu();
        });

        categoryFilters.appendChild(button);
    });
}

function addToCart(item) {
    if (!item.available) return;

    const cart = getCart();
    const existing = cart.find(
        entry => entry.menu_item_id === item.id
    );

    if (existing) {
        if (existing.quantity >= 50) {
            alert("Maximum quantity is 50 per item.");
            return;
        }
        existing.quantity++;
    } else {
        cart.push({
            menu_item_id: item.id,
            name: item.name,
            price: Number(item.price),
            quantity: 1
        });
    }

    localStorage.setItem("campusbite_cart", JSON.stringify(cart));
    updateCartCount();
}

function renderMenu() {
    const term = searchInput.value.trim().toLowerCase();

    const filtered = menuItems.filter(item => {
        const matchesSearch =
            item.name.toLowerCase().includes(term) ||
            item.category.toLowerCase().includes(term);

        const matchesCategory =
            selectedCategory === "All" ||
            item.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    menuGrid.replaceChildren();

    if (filtered.length === 0) {
        menuMessage.textContent = "No matching food items found.";
        return;
    }

    menuMessage.textContent = "";

    filtered.forEach(item => {
        const card = document.createElement("article");
        card.className = "food-card";

        const image = document.createElement("div");
        image.className = "food-image";
        image.textContent = "🍽️";

        const details = document.createElement("div");
        details.className = "food-details";

        const category = document.createElement("span");
        category.className = "food-category";
        category.textContent = item.category;

        const name = document.createElement("h3");
        name.textContent = item.name;

        const description = document.createElement("p");
        description.className = "food-description";
        description.textContent =
            item.description || "Freshly prepared";

        const bottom = document.createElement("div");
        bottom.className = "food-bottom";

        const price = document.createElement("strong");
        price.textContent = `₹${Number(item.price).toFixed(2)}`;

        const button = document.createElement("button");
        button.className = "add-button";
        button.textContent = item.available ? "Add +" : "Unavailable";
        button.disabled = !item.available;
        button.addEventListener("click", () => addToCart(item));

        bottom.append(price, button);
        details.append(category, name, description, bottom);
        card.append(image, details);
        menuGrid.appendChild(card);
    });
}

async function loadMenu() {
    try {
        const response = await fetch("/api/menu");

        if (!response.ok) {
            throw new Error("Menu request failed");
        }

        menuItems = await response.json();
        renderCategories();
        renderMenu();
    } catch (error) {
        console.error(error);
        menuMessage.textContent =
            "Unable to load menu. Check the Flask server.";
    }
}

searchInput.addEventListener("input", renderMenu);
updateCartCount();
loadMenu();
