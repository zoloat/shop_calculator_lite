// ── ストレージ ──────────────────────────────────────────
const DB = {
  getProducts: () => JSON.parse(localStorage.getItem('calc_products') || '[]'),
  saveProducts: (arr) => localStorage.setItem('calc_products', JSON.stringify(arr)),
  getCart: () => JSON.parse(localStorage.getItem('calc_cart') || '[]'),
  saveCart: (arr) => localStorage.setItem('calc_cart', JSON.stringify(arr)),
};

// ── 状態 ───────────────────────────────────────────────
let currentScreen = 'home';
let activeCategory = null;
let selectedProduct = null;
let quantityInput = '0';

// 純粋電卓用
let calcExpr = '';
let calcDisplay = '0';
let calcJustEvaled = false;

// ── 画面切り替え ───────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  currentScreen = name;
}

// ── ホーム画面 ────────────────────────────────────────
function renderHome() {
  const products = DB.getProducts();
  const homeEl = document.getElementById('screen-home');

  if (products.length === 0) {
    homeEl.innerHTML = buildPureCalcHTML();
    initPureCalc();
    return;
  }

  homeEl.innerHTML = buildProductListHTML(products);
  initProductList(products);
}

function buildProductListHTML(products) {
  return `
    <div class="header">
      <h1>商品一覧</h1>
      <button class="btn-manage" onclick="location.href='manage.html'">商品管理</button>
    </div>
    <div class="category-filter" id="cat-filter">
      ${[1,2,3,4,5].map(n => `<button class="btn-cat${activeCategory===n?' active':''}" data-cat="${n}" onclick="toggleCategory(${n})">カテゴリ${n}</button>`).join('')}
    </div>
    <div class="product-list" id="product-list"></div>
    <div class="bottom-bar">
      <button class="btn-checkout" id="btn-checkout" onclick="goCheckout()">清算</button>
    </div>
  `;
}

function initProductList(products) {
  renderProductList(products);
}

function renderProductList(products) {
  const cart = DB.getCart();
  const filtered = activeCategory
    ? products.filter(p => p.category === activeCategory)
    : products;

  const listEl = document.getElementById('product-list');
  if (!listEl) return;

  if (filtered.length === 0) {
    listEl.innerHTML = `<p class="empty-msg">このカテゴリに商品がありません</p>`;
  } else {
    listEl.innerHTML = filtered.map(p => {
      const cartItem = cart.find(c => c.productId === p.id);
      const qty = cartItem ? cartItem.quantity : 0;
      return `
        <div class="product-item${qty > 0 ? ' in-cart' : ''}" onclick="selectProduct('${p.id}')">
          <div>
            <div class="product-name">${escHtml(p.name)}</div>
            <div class="product-meta">カテゴリ ${p.category}</div>
          </div>
          <div class="product-right">
            <div class="product-price">¥${p.price.toLocaleString()}</div>
            ${qty > 0 ? `<div class="cart-badge">${qty}個</div>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  // 清算ボタン：カート内に1個以上あれば有効
  const hasItems = cart.some(c => c.quantity > 0);
  const btn = document.getElementById('btn-checkout');
  if (btn) btn.disabled = !hasItems;
}

function toggleCategory(n) {
  activeCategory = activeCategory === n ? null : n;
  const products = DB.getProducts();
  document.querySelectorAll('.btn-cat').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.cat) === activeCategory);
  });
  renderProductList(products);
}

function selectProduct(id) {
  const products = DB.getProducts();
  selectedProduct = products.find(p => p.id === id);
  if (!selectedProduct) return;

  const cart = DB.getCart();
  const existing = cart.find(c => c.productId === id);
  quantityInput = existing && existing.quantity > 0 ? String(existing.quantity) : '0';

  showScreen('quantity');
  renderQuantityScreen();
}

function goCheckout() {
  showScreen('checkout');
  renderCheckoutScreen();
}

// ── 個数入力 ───────────────────────────────────────────
function renderQuantityScreen() {
  const el = document.getElementById('screen-quantity');
  el.innerHTML = `
    <div class="quantity-header">
      <button class="btn-back" onclick="backToHome()">←</button>
      <div class="quantity-product-name">${escHtml(selectedProduct.name)}</div>
      <div class="quantity-product-price">¥${selectedProduct.price.toLocaleString()}</div>
    </div>
    <div class="quantity-display">
      <div class="quantity-label">個数</div>
      <div class="quantity-value" id="qty-val">${quantityInput}</div>
    </div>
    <div class="qty-grid">
      ${[7,8,9].map(n=>`<button class="qty-btn" onclick="qtyInput('${n}')">${n}</button>`).join('')}
      ${[4,5,6].map(n=>`<button class="qty-btn" onclick="qtyInput('${n}')">${n}</button>`).join('')}
      ${[1,2,3].map(n=>`<button class="qty-btn" onclick="qtyInput('${n}')">${n}</button>`).join('')}
      <button class="qty-btn" onclick="qtyInput('0')">0</button>
      <button class="qty-btn fn" onclick="qtyInput('000')">000</button>
      <button class="qty-btn fn" onclick="qtyBack()">⌫</button>
      <button class="qty-btn confirm" onclick="qtyConfirm()">✓</button>
    </div>
  `;
}

function updateQtyDisplay() {
  const el = document.getElementById('qty-val');
  if (el) el.textContent = quantityInput;
}

function qtyInput(digit) {
  if (quantityInput === '0') {
    // 000は0のまま
    quantityInput = digit === '000' ? '0' : digit;
  } else {
    const next = quantityInput + digit;
    if (next.length > 6) return;
    quantityInput = next;
  }
  updateQtyDisplay();
}

function qtyAC() {
  quantityInput = '0';
  updateQtyDisplay();
}

function qtyBack() {
  if (quantityInput.length <= 1) {
    quantityInput = '0';
  } else {
    quantityInput = quantityInput.slice(0, -1);
  }
  updateQtyDisplay();
}

function qtyConfirm() {
  const qty = parseInt(quantityInput, 10) || 0;
  const cart = DB.getCart();
  const idx = cart.findIndex(c => c.productId === selectedProduct.id);
  if (idx >= 0) {
    if (qty === 0) cart.splice(idx, 1);
    else cart[idx].quantity = qty;
  } else if (qty > 0) {
    cart.push({ productId: selectedProduct.id, quantity: qty });
  }
  DB.saveCart(cart);
  backToHome();
}

function backToHome() {
  showScreen('home');
  renderHome();
}

// ── 精算画面 ───────────────────────────────────────────
function renderCheckoutScreen() {
  const products = DB.getProducts();
  const cart = DB.getCart().filter(c => c.quantity > 0);
  const el = document.getElementById('screen-checkout');

  const items = cart.map(c => {
    const p = products.find(p => p.id === c.productId);
    if (!p) return null;
    return { name: p.name, price: p.price, quantity: c.quantity, subtotal: p.price * c.quantity };
  }).filter(Boolean);

  const total = items.reduce((s, i) => s + i.subtotal, 0);

  el.innerHTML = `
    <div class="checkout-header">
      <button class="btn-back" onclick="backToHome()">←</button>
      <h2>清算</h2>
    </div>
    <div class="checkout-list">
      ${items.length === 0
        ? `<p class="empty-msg">カートが空です</p>`
        : items.map(i => `
          <div class="checkout-item">
            <div class="checkout-item-left">
              <div class="name">${escHtml(i.name)}</div>
              <div class="detail">¥${i.price.toLocaleString()} × ${i.quantity}個</div>
            </div>
            <div class="checkout-item-right">
              <div class="subtotal">¥${i.subtotal.toLocaleString()}</div>
            </div>
          </div>`).join('')
      }
    </div>
    <div class="checkout-total">
      <span class="label">合計</span>
      <span class="amount">¥${total.toLocaleString()}</span>
    </div>
    <div class="bottom-bar">
      <button class="btn-confirm" onclick="confirmCheckout()">確定してリセット</button>
    </div>
  `;
}

function confirmCheckout() {
  DB.saveCart([]);
  activeCategory = null;
  backToHome();
}

// ── 純粋電卓 ───────────────────────────────────────────
function buildPureCalcHTML() {
  return `
    <div class="header">
      <h1>電卓</h1>
      <button class="btn-manage" onclick="location.href='manage.html'">商品管理</button>
    </div>
    <div class="calc-display">
      <div class="calc-expr" id="calc-expr"></div>
      <div class="calc-result" id="calc-result">0</div>
    </div>
    <div class="calc-grid">
      <button class="calc-btn fn" onclick="calcAC()">AC</button>
      <button class="calc-btn fn" onclick="calcPlusMinus()">±</button>
      <button class="calc-btn fn" onclick="calcPercent()">%</button>
      <button class="calc-btn op" onclick="calcOp('÷')">÷</button>

      <button class="calc-btn" onclick="calcNum('7')">7</button>
      <button class="calc-btn" onclick="calcNum('8')">8</button>
      <button class="calc-btn" onclick="calcNum('9')">9</button>
      <button class="calc-btn op" onclick="calcOp('×')">×</button>

      <button class="calc-btn" onclick="calcNum('4')">4</button>
      <button class="calc-btn" onclick="calcNum('5')">5</button>
      <button class="calc-btn" onclick="calcNum('6')">6</button>
      <button class="calc-btn op" onclick="calcOp('−')">−</button>

      <button class="calc-btn" onclick="calcNum('1')">1</button>
      <button class="calc-btn" onclick="calcNum('2')">2</button>
      <button class="calc-btn" onclick="calcNum('3')">3</button>
      <button class="calc-btn op" onclick="calcOp('+')">+</button>

      <button class="calc-btn zero" onclick="calcNum('0')">0</button>
      <button class="calc-btn" onclick="calcDot()">.</button>
      <button class="calc-btn eq" onclick="calcEqual()">=</button>
    </div>
  `;
}

function initPureCalc() {
  calcExpr = '';
  calcDisplay = '0';
  calcJustEvaled = false;
  updateCalcDisplay();
}

function updateCalcDisplay() {
  const exprEl = document.getElementById('calc-expr');
  const resEl = document.getElementById('calc-result');
  if (exprEl) exprEl.textContent = calcExpr;
  if (resEl) resEl.textContent = calcDisplay;
}

function calcNum(n) {
  if (calcJustEvaled) { calcExpr = ''; calcDisplay = '0'; calcJustEvaled = false; }
  if (calcDisplay === '0') calcDisplay = n;
  else if (calcDisplay.length < 10) calcDisplay += n;
  updateCalcDisplay();
}

function calcDot() {
  if (calcJustEvaled) { calcDisplay = '0'; calcJustEvaled = false; }
  if (!calcDisplay.includes('.')) calcDisplay += '.';
  updateCalcDisplay();
}

function calcOp(op) {
  calcJustEvaled = false;
  calcExpr = calcDisplay + ' ' + op;
  calcDisplay = '0';
  updateCalcDisplay();
}

function calcEqual() {
  if (!calcExpr) return;
  const parts = calcExpr.trim().split(' ');
  const a = parseFloat(parts[0]);
  const op = parts[1];
  const b = parseFloat(calcDisplay);
  let result;
  if (op === '+') result = a + b;
  else if (op === '−') result = a - b;
  else if (op === '×') result = a * b;
  else if (op === '÷') result = b !== 0 ? a / b : 'エラー';
  else result = b;

  if (typeof result === 'number') {
    result = parseFloat(result.toPrecision(10));
    calcDisplay = String(result);
  } else {
    calcDisplay = result;
  }
  calcExpr = '';
  calcJustEvaled = true;
  updateCalcDisplay();
}

function calcAC() {
  calcExpr = '';
  calcDisplay = '0';
  calcJustEvaled = false;
  updateCalcDisplay();
}

function calcPlusMinus() {
  if (calcDisplay !== '0') {
    calcDisplay = calcDisplay.startsWith('-') ? calcDisplay.slice(1) : '-' + calcDisplay;
    updateCalcDisplay();
  }
}

function calcPercent() {
  calcDisplay = String(parseFloat(calcDisplay) / 100);
  updateCalcDisplay();
}

// ── ユーティリティ ─────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── 初期化 ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  showScreen('home');
  renderHome();
});
