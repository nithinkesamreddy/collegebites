'use strict';

/* ── DOM refs ─────────────────────────────── */
const menuGrid       = document.getElementById('menu-grid');
const menuStatus     = document.getElementById('menu-status');
const searchInput    = document.getElementById('search-input');
const categoryFilters = document.getElementById('category-filters');
const cartCount      = document.getElementById('cart-count');

/* ── State ──────────────────────────────────── */
let menuItems        = [];
let selectedCategory = 'All';

/* ── Emoji map for food categories ─────────── */
const CATEGORY_EMOJI = {
  Breakfast: '🍳',
  Snacks:    '🥪',
  Meals:     '🍛',
  Drinks:    '🥤',
};

function foodEmoji(item) {
  if (item.image_url) return null; // has real image
  return CATEGORY_EMOJI[item.category] || '🍽️';
}

/* ─────────────────────────────────────────────
   CART HELPERS
───────────────────────────────────────────── */
function getCart() {
  try {
    const c = JSON.parse(localStorage.getItem('campusbite_cart') || '[]');
    return Array.isArray(c) ? c : [];
  } catch { return []; }
}

function updateCartCount() {
  const total = getCart().reduce((s, i) => s + i.quantity, 0);
  cartCount.textContent = total;
}

/* ─────────────────────────────────────────────
   TOAST NOTIFICATION
───────────────────────────────────────────── */
let toastTimer = null;

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  clearTimeout(toastTimer);

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${message}`;
  document.body.appendChild(toast);

  toastTimer = setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 350);
  }, 2400);
}

/* ─────────────────────────────────────────────
   CATEGORY FILTERS
───────────────────────────────────────────── */
function renderCategories() {
  const cats = ['All', ...new Set(menuItems.map(i => i.category))];
  categoryFilters.replaceChildren();
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter' + (cat === selectedCategory ? ' active' : '');
    btn.textContent = (CATEGORY_EMOJI[cat] ? CATEGORY_EMOJI[cat] + ' ' : '') + cat;
    btn.setAttribute('aria-pressed', cat === selectedCategory);
    btn.addEventListener('click', () => {
      selectedCategory = cat;
      renderCategories();
      renderMenu();
    });
    categoryFilters.appendChild(btn);
  });
}

/* ─────────────────────────────────────────────
   ADD TO CART
───────────────────────────────────────────── */
function addToCart(item, btn) {
  if (!item.available) return;

  const cart = getCart();
  const existing = cart.find(e => e.menu_item_id === item.id);

  if (existing) {
    if (existing.quantity >= 50) {
      showToast('Maximum 50 per item allowed.', 'error');
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

  localStorage.setItem('campusbite_cart', JSON.stringify(cart));
  updateCartCount();

  // Button feedback
  const original = btn.textContent;
  btn.textContent = '✓ Added';
  btn.classList.add('added');
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('added');
    btn.disabled = false;
  }, 1000);

  showToast(`${item.name} added to cart!`);
}

/* ─────────────────────────────────────────────
   RENDER MENU GRID
───────────────────────────────────────────── */
function renderMenu() {
  const term = searchInput.value.trim().toLowerCase();

  const filtered = menuItems.filter(item => {
    const matchSearch =
      item.name.toLowerCase().includes(term) ||
      (item.description || '').toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term);
    const matchCat =
      selectedCategory === 'All' || item.category === selectedCategory;
    return matchSearch && matchCat;
  });

  menuGrid.replaceChildren();

  if (filtered.length === 0) {
    menuStatus.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No items found</h3>
        <p>Try a different search term or category.</p>
      </div>`;
    return;
  }

  menuStatus.textContent = '';

  filtered.forEach((item, idx) => {
    const card = document.createElement('article');
    card.className = 'food-card';
    card.style.animationDelay = `${idx * 40}ms`;

    const emoji = foodEmoji(item);

    /* Image area */
    const imgDiv = document.createElement('div');
    imgDiv.className = 'food-image';
    if (item.image_url) {
      const img = document.createElement('img');
      img.src = item.image_url;
      img.alt = item.name;
      img.loading = 'lazy';
      imgDiv.appendChild(img);
    } else {
      imgDiv.textContent = emoji;
    }

    if (!item.available) {
      const overlay = document.createElement('div');
      overlay.className = 'unavailable-overlay';
      overlay.innerHTML = '<span class="unavailable-badge">Unavailable</span>';
      imgDiv.appendChild(overlay);
    }

    /* Details area */
    const details = document.createElement('div');
    details.className = 'food-details';

    const cat = document.createElement('span');
    cat.className = 'food-category';
    cat.textContent = item.category;

    const name = document.createElement('h3');
    name.textContent = item.name;

    const desc = document.createElement('p');
    desc.className = 'food-description';
    desc.textContent = item.description || 'Freshly prepared in our campus kitchen.';

    const bottom = document.createElement('div');
    bottom.className = 'food-bottom';

    const price = document.createElement('span');
    price.className = 'food-price';
    price.textContent = `₹${Number(item.price).toFixed(2)}`;

    const addBtn = document.createElement('button');
    addBtn.className = 'add-button';
    addBtn.textContent = item.available ? 'Add +' : 'Unavailable';
    addBtn.disabled = !item.available;
    addBtn.addEventListener('click', () => addToCart(item, addBtn));

    bottom.append(price, addBtn);
    details.append(cat, name, desc, bottom);
    card.append(imgDiv, details);
    menuGrid.appendChild(card);
  });
}

/* ─────────────────────────────────────────────
   LOAD MENU FROM BACKEND
───────────────────────────────────────────── */
async function loadMenu() {
  menuStatus.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
  menuGrid.replaceChildren();

  try {
    const res = await fetch('/api/menu');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    menuItems = await res.json();

    if (menuItems.length === 0) {
      menuStatus.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🍽️</div>
          <h3>Menu is empty</h3>
          <p>No items have been added yet. Check back soon!</p>
        </div>`;
      return;
    }

    renderCategories();
    renderMenu();
  } catch (err) {
    console.error(err);
    menuStatus.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Couldn't load the menu</h3>
        <p>Make sure the Flask server is running and connected to the database.</p>
      </div>`;
  }
}

/* ── Init ─────────────────────────────────── */
searchInput.addEventListener('input', renderMenu);
updateCartCount();
loadMenu();
