const CATS = [
  { key: 'Food', icon: '🍜', label: 'Food', bg: 'rgba(232,112,64,0.18)', color: '#e87040' },
  { key: 'Transport', icon: '🚗', label: 'Travel', bg: 'rgba(100,180,255,0.15)', color: '#64b4ff' },
  { key: 'Shopping', icon: '🛍️', label: 'Shop', bg: 'rgba(200,100,255,0.15)', color: '#c864ff' },
  { key: 'Entertainment', icon: '🎬', label: 'Fun', bg: 'rgba(255,80,140,0.15)', color: '#ff508c' },
  { key: 'Health', icon: '💊', label: 'Health', bg: 'rgba(92,224,138,0.15)', color: '#5ce08a' },
  { key: 'Housing', icon: '🏠', label: 'Home', bg: 'rgba(245,197,66,0.15)', color: '#f5c542' },
  { key: 'Education', icon: '📚', label: 'Edu', bg: 'rgba(80,200,255,0.15)', color: '#50c8ff' },
  { key: 'Other', icon: '✨', label: 'Other', bg: 'rgba(180,180,180,0.12)', color: '#aaaaaa' },
];

// Build category grid
let selectedCat = 'Food';
const catGrid = document.getElementById('catGrid');
CATS.forEach(c => {
  const btn = document.createElement('button');
  btn.className = 'cat-btn' + (c.key === 'Food' ? ' active' : '');
  btn.type = 'button';
  btn.dataset.key = c.key;
  btn.innerHTML = '<span class="ico">' + c.icon + '</span>' + c.label;
  btn.onclick = () => {
    selectedCat = c.key;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };
  catGrid.appendChild(btn);
});

// ─── State ───────────────────────────────────────────
let expenses = [];
let currentUID = null;
let unsubscribe = null; // Firestore listener cleanup

// ─── Set date ────────────────────────────────────────
const d = new Date();
document.getElementById('dateBadge').innerHTML =
  d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).replace(',', '<br>');

// ─── Helpers ─────────────────────────────────────────
function fmt(n) {
  return '₹' + Number(n.toFixed(0)).toLocaleString('en-IN');
}

function catInfo(key) {
  return CATS.find(c => c.key === key) || CATS[CATS.length - 1];
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ─── Firestore reference helper ──────────────────────
function expensesRef() {
  return db.collection('users').doc(currentUID).collection('expenses');
}

// ─── localStorage → Firestore Migration ─────────────
async function migrateLocalStorage(uid) {
  const raw = localStorage.getItem('expensio');
  if (!raw) return;

  let oldExpenses;
  try {
    oldExpenses = JSON.parse(raw);
  } catch (e) {
    return;
  }
  if (!Array.isArray(oldExpenses) || oldExpenses.length === 0) return;

  const batch = db.batch();
  const ref = db.collection('users').doc(uid).collection('expenses');

  oldExpenses.forEach(exp => {
    const docRef = ref.doc();
    batch.set(docRef, {
      name: exp.name,
      amount: exp.amount,
      cat: exp.cat,
      date: exp.date,
      createdAt: exp.id || Date.now()
    });
  });

  try {
    await batch.commit();
    localStorage.setItem('expensio_migrated', raw);
    localStorage.removeItem('expensio');
    showToast('✅ Migrated ' + oldExpenses.length + ' expenses to cloud');
    console.log('Migration complete:', oldExpenses.length, 'expenses moved to Firestore');
  } catch (err) {
    console.error('Migration failed:', err);
    showToast('⚠️ Migration failed — expenses kept in local storage');
  }
}

// ─── Auth Guard + Firestore Listener ─────────────────
auth.onAuthStateChanged(async user => {
  if (user && !user.isAnonymous) {
    // ✅ Authenticated user
    currentUID = user.uid;
    console.log('🔑 Signed in as:', user.email, '(' + currentUID + ')');

    // Show user info in header
    document.getElementById('userEmail').textContent = user.email;
    document.getElementById('userInfo').style.display = 'flex';

    // Run one-time migration from localStorage
    await migrateLocalStorage(currentUID);

    // Real-time listener — keeps expenses[] in sync
    unsubscribe = expensesRef()
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        expenses = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          amount: doc.data().amount,
          cat: doc.data().cat,
          date: doc.data().date
        }));
        updateAll();
      }, err => {
        console.error('Firestore listener error:', err);
        showToast('⚠️ Could not load expenses');
      });

  } else {
    // 🚫 Not signed in → redirect to auth page
    window.location.href = 'auth.html';
  }
});

// ─── Logout ──────────────────────────────────────────
async function logout() {
  try {
    if (unsubscribe) unsubscribe(); // Detach Firestore listener
    await auth.signOut();
    window.location.href = 'auth.html';
  } catch (err) {
    console.error('Logout failed:', err);
    showToast('⚠️ Logout failed');
  }
}

// ─── Add Expense ─────────────────────────────────────
async function addExpense() {
  const name = document.getElementById('expName').value.trim();
  const amount = parseFloat(document.getElementById('expAmount').value);
  if (!name) { showToast('⚠️ Please enter an expense name'); return; }
  if (!amount || amount <= 0) { showToast('⚠️ Enter a valid amount'); return; }
  if (!currentUID) { showToast('⚠️ Not signed in yet'); return; }

  try {
    await expensesRef().add({
      name,
      amount,
      cat: selectedCat,
      date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      createdAt: Date.now()
    });

    document.getElementById('expName').value = '';
    document.getElementById('expAmount').value = '';
    showToast('✅ Expense added!');
  } catch (err) {
    console.error('Add failed:', err);
    showToast('⚠️ Failed to add expense');
  }
}

// ─── Delete Expense ──────────────────────────────────
async function deleteExpense(id) {
  if (!currentUID) return;
  try {
    await expensesRef().doc(id).delete();
    showToast('🗑️ Removed');
  } catch (err) {
    console.error('Delete failed:', err);
    showToast('⚠️ Failed to remove expense');
  }
}

// ─── Update UI ───────────────────────────────────────
function updateAll() {
  updateStats();
  renderList();
  renderBreakdown();
}

function updateStats() {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const max = expenses.reduce((m, e) => e.amount > m.amount ? e : m, { amount: 0, name: '—' });
  const avg = expenses.length ? total / expenses.length : 0;

  document.getElementById('totalSpent').textContent = fmt(total);
  document.getElementById('totalCount').textContent = expenses.length + ' expense' + (expenses.length !== 1 ? 's' : '');
  document.getElementById('highestAmt').textContent = fmt(max.amount);
  document.getElementById('highestName').textContent = max.name;
  document.getElementById('avgAmt').textContent = fmt(avg);
}

function renderList() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const ul = document.getElementById('expenseList');
  const f = expenses.filter(e =>
    e.name.toLowerCase().includes(q) || e.cat.toLowerCase().includes(q)
  );

  if (!f.length) {
    ul.innerHTML =
      '<div class="empty-state"><div class="big">' + (q ? '🔍' : '🌿') + '</div>' +
      (q ? 'No matches found' : 'No expenses yet.<br>Add your first one!') + '</div>';
    return;
  }

  ul.innerHTML = f.map(e => {
    const c = catInfo(e.cat);
    return '<li class="expense-item">' +
      '<div class="cat-icon" style="background:' + c.bg + '">' + c.icon + '</div>' +
      '<div class="expense-info">' +
      '<div class="expense-name">' + esc(e.name) + '</div>' +
      '<div class="expense-meta">' + c.label + ' · ' + e.date + '</div>' +
      '</div>' +
      '<div class="expense-amount">' + fmt(e.amount) + '</div>' +
      '<button class="del-btn" onclick="deleteExpense(\'' + e.id + '\')" title="Remove">✕</button>' +
      '</li>';
  }).join('');
}

function renderBreakdown() {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCat = {};
  expenses.forEach(e => byCat[e.cat] = (byCat[e.cat] || 0) + e.amount);
  const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (!sorted.length) {
    document.getElementById('breakdown').innerHTML =
      '<div style="color:var(--muted);font-size:0.78rem">No data yet</div>';
    return;
  }

  document.getElementById('breakdown').innerHTML = sorted.map(([key, amt]) => {
    const pct = total ? Math.round(amt / total * 100) : 0;
    const c = catInfo(key);
    return '<div class="bar-row">' +
      '<div class="bar-label">' + c.icon + ' ' + c.label + '</div>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + c.color + '"></div></div>' +
      '<div class="bar-pct">' + pct + '%</div>' +
      '</div>';
  }).join('');
}

// ─── Enter key shortcut ──────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && ['expName', 'expAmount'].includes(document.activeElement.id)) {
    addExpense();
  }
});

// Initial render (empty state until Firestore loads)
updateAll();
