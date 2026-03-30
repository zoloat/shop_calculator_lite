// ── ストレージ ──────────────────────────────────────────
const DB = {
  getProducts: () => JSON.parse(localStorage.getItem('calc_products') || '[]'),
  saveProducts: (arr) => localStorage.setItem('calc_products', JSON.stringify(arr)),
};

// ── 状態 ───────────────────────────────────────────────
let editingId = null;

// ── 一覧描画 ───────────────────────────────────────────
function renderList() {
  const products = DB.getProducts();
  const el = document.getElementById('manage-list');

  if (products.length === 0) {
    el.innerHTML = `<p class="empty-msg">商品が登録されていません<br>＋ボタンから追加してください</p>`;
    return;
  }

  el.innerHTML = products.map(p => `
    <div class="manage-item" onclick="openEdit('${p.id}')">
      <div>
        <div class="name">${escHtml(p.name)}</div>
        <div class="meta">カテゴリ ${p.category}</div>
      </div>
      <div class="price">¥${p.price.toLocaleString()}</div>
    </div>
  `).join('');
}

// ── 新規登録モーダル ───────────────────────────────────
function openAdd() {
  editingId = null;
  document.getElementById('modal-title').textContent = '商品を追加';
  document.getElementById('field-name').value = '';
  document.getElementById('field-price').value = '';
  document.getElementById('field-category').value = '1';
  document.getElementById('btn-delete').style.display = 'none';
  openModal();
}

// ── 編集モーダル ───────────────────────────────────────
function openEdit(id) {
  const products = DB.getProducts();
  const p = products.find(p => p.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById('modal-title').textContent = '商品を編集';
  document.getElementById('field-name').value = p.name;
  document.getElementById('field-price').value = p.price;
  document.getElementById('field-category').value = p.category;
  document.getElementById('btn-delete').style.display = '';
  openModal();
}

function openModal() {
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('field-name').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// ── 保存 ───────────────────────────────────────────────
function saveProduct() {
  const name = document.getElementById('field-name').value.trim();
  const price = parseInt(document.getElementById('field-price').value, 10);
  const category = parseInt(document.getElementById('field-category').value, 10);

  if (!name) { alert('商品名を入力してください'); return; }
  if (isNaN(price) || price < 0) { alert('正しい値段を入力してください'); return; }

  const products = DB.getProducts();

  if (editingId) {
    const idx = products.findIndex(p => p.id === editingId);
    if (idx >= 0) {
      products[idx] = { ...products[idx], name, price, category };
    }
  } else {
    products.push({ id: genId(), name, price, category });
  }

  DB.saveProducts(products);
  closeModal();
  renderList();
}

// ── 削除 ───────────────────────────────────────────────
function deleteProduct() {
  if (!editingId) return;
  if (!confirm('この商品を削除しますか？')) return;
  const products = DB.getProducts().filter(p => p.id !== editingId);
  DB.saveProducts(products);

  // カートからも除去
  const cart = JSON.parse(localStorage.getItem('calc_cart') || '[]')
    .filter(c => c.productId !== editingId);
  localStorage.setItem('calc_cart', JSON.stringify(cart));

  closeModal();
  renderList();
}

// ── JSONエクスポート ────────────────────────────────────
function exportJSON() {
  const products = DB.getProducts();
  const json = JSON.stringify(products, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'products.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ── JSONインポート ──────────────────────────────────────
function importJSON() {
  document.getElementById('import-input').click();
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) throw new Error();
      const valid = data.filter(p =>
        p && typeof p.name === 'string' && typeof p.price === 'number' && p.category
      ).map(p => ({
        id: p.id || genId(),
        name: p.name,
        price: p.price,
        category: parseInt(p.category, 10) || 1,
      }));
      if (valid.length === 0) { alert('有効なデータがありませんでした'); return; }
      if (!confirm(`${valid.length}件のデータをインポートします。現在のデータは上書きされます。`)) return;
      DB.saveProducts(valid);
      renderList();
      alert('インポートしました');
    } catch {
      alert('JSONの形式が正しくありません');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

// ── ユーティリティ ─────────────────────────────────────
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── 初期化 ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderList();

  // モーダル背景クリックで閉じる
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
});
