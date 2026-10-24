'use strict';

/* ── DOM refs ─────────────────────────────── */
const cartCount      = document.getElementById('cart-count');
const cartItemsList  = document.getElementById('cart-items-list');
const cartLayout     = document.getElementById('cart-layout');
const emptyCartState = document.getElementById('empty-cart-state');
const btnClearCart   = document.getElementById('btn-clear-cart');
const btnPlaceOrder  = document.getElementById('btn-place-order');
const summaryCount   = document.getElementById('summary-count');
const summarySubtotal= document.getElementById('summary-subtotal');
const summaryTotal   = document.getElementById('summary-total');
const customerName   = document.getElementById('customer-name');
const customerContact= document.getElementById('customer-contact');
const errName        = document.getElementById('err-name');
const errContact     = document.getElementById('err-contact');
const orderConfirm   = document.getElementById('order-confirm');
const confirmOrderId = document.getElementById('confirm-order-id');
const checkoutForm   = document.querySelector('.checkout-form');

/* ── Category emoji (same as menu.js) ─────── */
const CATEGORY_EMOJI = { Breakfast:'🍳', Snacks:'🥪', Meals:'🍛', Drinks:'🥤' };

/* ─────────────────────────────────────────────
   CART HELPERS
───────────────────────────────────────────── */
function getCart() {
  try {
    const c = JSON.parse(localStorage.getItem('campusbite_cart') || '[]');
    return Array.isArray(c) ? c : [];
  } catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem('campusbite_cart', JSON.stringify(cart));
}

function updateCartCount() {
  const total = getCart().reduce((s, i) => s + i.quantity, 0);
  cartCount.textContent = total;
}

/* ─────────────────────────────────────────────
   TOAST
───────────────────────────────────────────── */
let _toastTimer = null;
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  clearTimeout(_toastTimer);
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${message}`;
  document.body.appendChild(toast);
  _toastTimer = setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 350);
  }, 2400);
}

/* ─────────────────────────────────────────────
   RENDER CART
───────────────────────────────────────────── */
function renderCart() {
  const cart = getCart();
  updateCartCount();

  if (cart.length === 0) {
    cartLayout.style.display = 'none';
    emptyCartState.style.display = 'block';
    return;
  }

  cartLayout.style.display = 'grid';
  emptyCartState.style.display = 'none';
  cartItemsList.replaceChildren();

  let subtotal = 0;

  cart.forEach((entry, idx) => {
    const sub = entry.price * entry.quantity;
    subtotal += sub;

    const row = document.createElement('div');
    row.className = 'cart-item';
    row.style.animationDelay = `${idx * 40}ms`;

    const emoji = CATEGORY_EMOJI[entry.category] || '🍽️';

    row.innerHTML = `
      <div class="cart-item-img">${emoji}</div>

      <div class="cart-item-info">
        <div class="cart-item-name">${escHtml(entry.name)}</div>
        <div class="cart-item-unit">₹${entry.price.toFixed(2)} each</div>
      </div>

      <div class="qty-control">
        <button class="qty-btn" data-action="dec" data-idx="${idx}" aria-label="Decrease quantity">−</button>
        <span class="qty-value">${entry.quantity}</span>
        <button class="qty-btn" data-action="inc" data-idx="${idx}" aria-label="Increase quantity">+</button>
      </div>

      <div class="cart-item-sub">₹${sub.toFixed(2)}</div>

      <button class="btn-remove" data-idx="${idx}" aria-label="Remove ${escHtml(entry.name)}">
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none"
             viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0
               01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0
               00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>`;

    cartItemsList.appendChild(row);
  });

  const itemWord = cart.length === 1 ? 'item' : 'items';
  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
  summaryCount.textContent    = `${totalQty} ${totalQty === 1 ? 'item' : 'items'}`;
  summarySubtotal.textContent = `₹${subtotal.toFixed(2)}`;
  summaryTotal.textContent    = `₹${subtotal.toFixed(2)}`;

  // Disable place-order if showing confirmation
  if (orderConfirm.style.display === 'block') return;
  btnPlaceOrder.disabled = cart.length === 0;
}

/* ─────────────────────────────────────────────
   QUANTITY & REMOVE EVENTS (delegated)
───────────────────────────────────────────── */
cartItemsList.addEventListener('click', e => {
  const btn = e.target.closest('[data-action], [data-idx].btn-remove');
  if (!btn) return;

  const idx = parseInt(btn.dataset.idx, 10);
  const cart = getCart();

  if (btn.classList.contains('btn-remove')) {
    const name = cart[idx]?.name || 'Item';
    cart.splice(idx, 1);
    saveCart(cart);
    renderCart();
    showToast(`${name} removed.`);
    return;
  }

  const action = btn.dataset.action;
  if (action === 'inc') {
    if (cart[idx].quantity >= 50) {
      showToast('Maximum 50 per item allowed.', 'error');
      return;
    }
    cart[idx].quantity++;
  } else if (action === 'dec') {
    cart[idx].quantity--;
    if (cart[idx].quantity <= 0) {
      const name = cart[idx].name;
      cart.splice(idx, 1);
      saveCart(cart);
      renderCart();
      showToast(`${name} removed.`);
      return;
    }
  }

  saveCart(cart);
  renderCart();
});

/* ─────────────────────────────────────────────
   CLEAR CART
───────────────────────────────────────────── */
btnClearCart.addEventListener('click', () => {
  if (!confirm('Clear your entire cart?')) return;
  saveCart([]);
  renderCart();
  showToast('Cart cleared.');
});

/* ─────────────────────────────────────────────
   FORM VALIDATION
───────────────────────────────────────────── */
function validateForm() {
  let ok = true;

  if (customerName.value.trim().length < 2) {
    customerName.classList.add('invalid');
    errName.classList.add('show');
    ok = false;
  } else {
    customerName.classList.remove('invalid');
    errName.classList.remove('show');
  }

  if (customerContact.value.trim().length < 3) {
    customerContact.classList.add('invalid');
    errContact.classList.add('show');
    ok = false;
  } else {
    customerContact.classList.remove('invalid');
    errContact.classList.remove('show');
  }

  return ok;
}

customerName.addEventListener('input', () => {
  if (customerName.value.trim().length >= 2) {
    customerName.classList.remove('invalid');
    errName.classList.remove('show');
  }
});

customerContact.addEventListener('input', () => {
  if (customerContact.value.trim().length >= 3) {
    customerContact.classList.remove('invalid');
    errContact.classList.remove('show');
  }
});

/* ─────────────────────────────────────────────
   PLACE ORDER
───────────────────────────────────────────── */
btnPlaceOrder.addEventListener('click', async () => {
  if (!validateForm()) return;

  const cart = getCart();
  if (cart.length === 0) {
    showToast('Your cart is empty!', 'error');
    return;
  }

  btnPlaceOrder.disabled = true;
  btnPlaceOrder.textContent = 'Placing order…';

  const payload = {
    customer_name:    customerName.value.trim(),
    customer_contact: customerContact.value.trim(),
    items: cart.map(i => ({
      menu_item_id: i.menu_item_id,
      quantity:     i.quantity
    }))
  };

  try {
    const res = await fetch('/api/orders', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    // Success — clear cart and show confirmation
    saveCart([]);
    updateCartCount();

    checkoutForm.style.display  = 'none';
    orderConfirm.style.display  = 'block';
    confirmOrderId.textContent  = `Order #${data.order_id}`;
    cartItemsList.replaceChildren();

    // Scroll to confirmation
    orderConfirm.scrollIntoView({ behavior: 'smooth', block: 'center' });

  } catch (err) {
    console.error(err);
    showToast(err.message || 'Order failed. Please try again.', 'error');
    btnPlaceOrder.disabled  = false;
    btnPlaceOrder.textContent = 'Place Order';
  }
});

/* ─────────────────────────────────────────────
   UTILITY
───────────────────────────────────────────── */
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Init ─────────────────────────────────── */
renderCart();
