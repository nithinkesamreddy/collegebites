'use strict';

/* ── DOM refs ─────────────────────────────── */
const cartCount       = document.getElementById('cart-count');
const ordersGrid      = document.getElementById('orders-grid');
const ordersStatus    = document.getElementById('orders-status');
const ordersSummary   = document.getElementById('orders-summary-text');
const statusFilters   = document.getElementById('status-filters');
const btnRefresh      = document.getElementById('btn-refresh');

/* ── State ──────────────────────────────────── */
let allOrders         = [];
let selectedStatus    = 'All';

const STATUS_SEQUENCE = ['Pending', 'Preparing', 'Ready', 'Completed'];

/* ─────────────────────────────────────────────
   CART COUNT (synced from localStorage)
───────────────────────────────────────────── */
function updateCartCount() {
  try {
    const c = JSON.parse(localStorage.getItem('campusbite_cart') || '[]');
    cartCount.textContent = Array.isArray(c) ? c.reduce((s,i) => s + i.quantity, 0) : 0;
  } catch { cartCount.textContent = 0; }
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
   FORMAT DATE
───────────────────────────────────────────── */
function formatTime(isoString) {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleString('en-IN', {
      day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return isoString; }
}

/* ─────────────────────────────────────────────
   STATUS FILTERS
───────────────────────────────────────────── */
statusFilters.addEventListener('click', e => {
  const btn = e.target.closest('.status-filter');
  if (!btn) return;
  selectedStatus = btn.dataset.status;
  document.querySelectorAll('.status-filter').forEach(b => {
    b.classList.toggle('active', b.dataset.status === selectedStatus);
  });
  renderOrders();
});

/* ─────────────────────────────────────────────
   RENDER ORDERS
───────────────────────────────────────────── */
function renderOrders() {
  const visible = selectedStatus === 'All'
    ? allOrders
    : allOrders.filter(o => o.status === selectedStatus);

  ordersGrid.replaceChildren();

  if (visible.length === 0) {
    ordersStatus.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No orders found</h3>
        <p>${selectedStatus === 'All' ? 'No orders have been placed yet.' : `No "${selectedStatus}" orders right now.`}</p>
      </div>`;
    return;
  }

  ordersStatus.textContent = '';

  visible.forEach((order, idx) => {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.style.animationDelay = `${idx * 40}ms`;

    /* Items chips */
    const itemChips = (order.items || []).map(item =>
      `<span class="order-item-chip">${escHtml(item.item_name)} × ${item.quantity}</span>`
    ).join('');

    /* Advance button */
    const curIdx     = STATUS_SEQUENCE.indexOf(order.status);
    const nextStatus = STATUS_SEQUENCE[curIdx + 1];
    const advanceBtn = nextStatus
      ? `<button class="btn-status advance" data-order-id="${order.id}" data-next="${nextStatus}">
           → Mark as ${nextStatus}
         </button>`
      : '';

    card.innerHTML = `
      <div>
        <div class="order-meta">
          <span class="order-id">Order #${order.id}</span>
          <span class="order-time">${formatTime(order.created_at)}</span>
        </div>
        <div class="order-customer">👤 ${escHtml(order.customer_name)}${order.customer_contact ? ' · ' + escHtml(order.customer_contact) : ''}</div>
        <div class="order-items-list">${itemChips || '<span style="color:var(--muted);font-size:13px;">No item details</span>'}</div>
        <div class="order-total">Total: ₹${Number(order.total_amount).toFixed(2)}</div>
        <div class="order-actions">${advanceBtn}</div>
      </div>
      <div>
        <span class="status-badge status-${order.status}">${order.status}</span>
      </div>`;

    ordersGrid.appendChild(card);
  });
}

/* ─────────────────────────────────────────────
   ADVANCE ORDER STATUS
───────────────────────────────────────────── */
ordersGrid.addEventListener('click', async e => {
  const btn = e.target.closest('.btn-status.advance');
  if (!btn) return;

  const orderId  = btn.dataset.orderId;
  const next     = btn.dataset.next;

  btn.disabled   = true;
  btn.textContent = 'Updating…';

  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: next })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    // Update locally
    const order = allOrders.find(o => o.id === parseInt(orderId, 10));
    if (order) order.status = next;

    renderOrders();
    showToast(`Order #${orderId} marked as ${next}.`);
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Status update failed.', 'error');
    btn.disabled   = false;
    btn.textContent = `→ Mark as ${next}`;
  }
});

/* ─────────────────────────────────────────────
   LOAD ORDERS FROM BACKEND
───────────────────────────────────────────── */
async function loadOrders() {
  ordersStatus.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
  ordersGrid.replaceChildren();
  ordersSummary.textContent = 'Loading orders…';
  btnRefresh.disabled = true;

  try {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allOrders = await res.json();

    const total   = allOrders.length;
    const pending = allOrders.filter(o => o.status === 'Pending').length;
    ordersSummary.textContent =
      `${total} order${total !== 1 ? 's' : ''} total · ${pending} pending`;

    renderOrders();
  } catch (err) {
    console.error(err);
    ordersStatus.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Couldn't load orders</h3>
        <p>Make sure the Flask server is running.</p>
      </div>`;
    ordersSummary.textContent = 'Failed to load.';
  } finally {
    btnRefresh.disabled = false;
  }
}

/* ─────────────────────────────────────────────
   UTILITY
───────────────────────────────────────────── */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Init ─────────────────────────────────── */
btnRefresh.addEventListener('click', loadOrders);
updateCartCount();
loadOrders();
