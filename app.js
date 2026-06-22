// ============================================
// AreaMart — Supabase Config & Shared Helpers
// ============================================

const SUPABASE_URL = 'https://zgdabzgdqiiaukoinqke.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZGFiemdkcWlpYXVrb2lucWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDg1MDQsImV4cCI6MjA5MzEyNDUwNH0.MEGv9P-SEZqeECPAYPD_3WrHyP9zCYojf-1DLVO9HVU';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== TOAST NOTIFICATIONS =====
function toast(message, type = 'default') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = 'toast show' + (type !== 'default' ? ' ' + type : '');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    el.classList.remove('show');
  }, 3000);
}

// ===== CURRENCY FORMAT =====
function formatNaira(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ===== PRODUCT EMOJI (since we don't have real images yet) =====
const CATEGORY_EMOJI = {
  'Grains': '🌾',
  'Cooking Essentials': '🫒',
  'Pasta & Noodles': '🍜',
  'Canned Goods': '🥫',
  'Bakery': '🍞',
  'Dairy & Eggs': '🥚',
  'Beverages': '🥤',
  'Snacks': '🍿',
  'Household': '🧴',
  'Fruits & Vegetables': '🥬',
};
function emojiFor(category) {
  return CATEGORY_EMOJI[category] || '🛒';
}

// ===== AUTH STATE =====
let currentUser = null;
let currentProfile = null;

async function loadSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    currentUser = session.user;
    const { data: profile } = await sb
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    currentProfile = profile;
  } else {
    currentUser = null;
    currentProfile = null;
  }
  return { user: currentUser, profile: currentProfile };
}

async function signOut() {
  await sb.auth.signOut();
  currentUser = null;
  currentProfile = null;
  window.location.href = 'index.html';
}

// ===== CART (stored in memory + localStorage-free, per-session) =====
// Note: per project constraints, we avoid localStorage and keep cart in memory only.
// Cart resets on page reload — acceptable for v1, can upgrade to DB-backed cart later.
window.cart = window.cart || [];

function addToCart(product, qty = 1) {
  const existing = window.cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    window.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      qty: qty,
      stock_quantity: product.stock_quantity,
    });
  }
  updateCartBadge();
  toast(`${product.name} added to cart`, 'success');
}

function removeFromCart(productId) {
  window.cart = window.cart.filter(i => i.id !== productId);
  updateCartBadge();
}

function updateCartQty(productId, qty) {
  const item = window.cart.find(i => i.id === productId);
  if (!item) return;
  if (qty <= 0) {
    removeFromCart(productId);
  } else {
    item.qty = Math.min(qty, item.stock_quantity);
  }
  updateCartBadge();
}

function cartTotal() {
  return window.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function cartCount() {
  return window.cart.reduce((sum, i) => sum + i.qty, 0);
}

function updateCartBadge() {
  const badge = document.getElementById('cartCount');
  if (badge) badge.textContent = cartCount();
}

// ===== NAVBAR INJECTION =====
function renderTopbar(activePage = '') {
  const el = document.getElementById('topbar');
  if (!el) return;
  const isAdmin = currentProfile && currentProfile.role === 'admin';
  el.innerHTML = `
    <div class="container">
      <a href="index.html" class="brand">AreaMart<span class="dot">.</span></a>
      <div class="nav-actions">
        <a href="index.html" class="nav-link ${activePage === 'shop' ? 'active' : ''}">Shop</a>
        ${currentUser ? `<a href="orders.html" class="nav-link ${activePage === 'orders' ? 'active' : ''}">My Orders</a>` : ''}
        ${isAdmin ? `<a href="admin.html" class="nav-link ${activePage === 'admin' ? 'active' : ''}">Admin</a>` : ''}
        ${currentUser
          ? `<a href="#" class="nav-link" onclick="signOut(); return false;">Sign out</a>`
          : `<a href="auth.html" class="nav-link">Sign in</a>`}
        <a href="cart.html" class="cart-btn">
          🛒 Cart <span class="cart-count" id="cartCount">${cartCount()}</span>
        </a>
      </div>
    </div>
  `;
}

// ===== REQUIRE AUTH GUARD =====
async function requireAuth(redirectTo = 'auth.html') {
  const { user } = await loadSession();
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  return user;
}

async function requireAdmin(redirectTo = 'index.html') {
  const { user, profile } = await loadSession();
  if (!user || !profile || profile.role !== 'admin') {
    toast('Admin access required', 'error');
    setTimeout(() => window.location.href = redirectTo, 1200);
    return null;
  }
  return user;
}
