const {
    MAX_ITEM_QUANTITY,
    getCart,
    saveCart,
    updateCartBadge,
    formatCurrency,
    showToast
} = window.CampusBite;

const menuGrid = document.getElementById("menu-grid");
const menuMessage = document.getElementById("menu-message");
const searchInput = document.getElementById("search-input");
const categoryFilters = document.getElementById("category-filters");

const categoryIcons = {
    Breakfast: "🥞",
    Meals: "🍛",
    Snacks: "🍔",
    Drinks: "🥤"
};

let menuItems = [];
let selectedCategory = "All";

function renderCategories() {
    const categories = [
        "All",
        ...new Set(menuItems.map(item => item.category))
    ];

    categoryFilters.replaceChildren();

    categories.forEach(category => {
        const button = document.createElement("button");
        button.className = "filter";
        button.type = "button";
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

function addToCart(item, button) {
    if (!item.available) {
        return;
    }

    const cart = getCart();
    const existing = cart.find(entry => entry.menu_item_id === item.id);

    if (existing) {
        if (existing.quantity >= MAX_ITEM_QUANTITY) {
            showToast(
                `Maximum quantity is ${MAX_ITEM_QUANTITY} per item.`,
                "error"
            );
            return;
        }

        existing.quantity += 1;
    } else {
        cart.push({
            menu_item_id: item.id,
            name: item.name,
            price: Number(item.price),
            quantity: 1
        });
    }

    saveCart(cart);
    showToast(`${item.name} added to cart`);

    if (button) {
        const originalLabel = button.textContent;
        button.textContent = "Added ✓";
        button.classList.add("added");

        setTimeout(() => {
            button.textContent = originalLabel;
            button.classList.remove("added");
        }, 900);
    }
}

function buildFoodImage(item) {
    const image = document.createElement("div");
    image.className = "food-image";

    if (item.image_url) {
        const img = document.createElement("img");
        img.src = item.image_url;
        img.alt = item.name;
        img.loading = "lazy";
        image.appendChild(img);
    } else {
        image.textContent = categoryIcons[item.category] || "🍽️";
    }

    return image;
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

        if (!item.available) {
            card.classList.add("unavailable");
        }

        const details = document.createElement("div");
        details.className = "food-details";

        const category = document.createElement("span");
        category.className = "food-category";
        category.textContent = item.category;

        const name = document.createElement("h3");
        name.textContent = item.name;

        const description = document.createElement("p");
        description.className = "food-description";
        description.textContent = item.description || "Freshly prepared";

        const bottom = document.createElement("div");
        bottom.className = "food-bottom";

        const price = document.createElement("strong");
        price.textContent = formatCurrency(item.price);

        const button = document.createElement("button");
        button.className = "add-button";
        button.type = "button";
        button.textContent = item.available ? "Add +" : "Unavailable";
        button.disabled = !item.available;
        button.addEventListener("click", () => addToCart(item, button));

        bottom.append(price, button);
        details.append(category, name, description, bottom);
        card.append(buildFoodImage(item), details);
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
updateCartBadge();
loadMenu();
