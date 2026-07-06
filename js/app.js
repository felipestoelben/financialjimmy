// If the Firebase SDK failed to load (blocked network, ad-blocker, CDN
// outage), fail loudly with a visible message instead of silently breaking
// every button on the page.
if (typeof firebase === 'undefined' || typeof auth === 'undefined') {
  document.body.innerHTML = '<div style="padding:40px 24px;text-align:center;font-family:sans-serif;color:#333"><h2>Não foi possível carregar o app</h2><p>Verifique sua conexão com a internet e recarregue a página.</p></div>';
  throw new Error('Firebase SDK not loaded');
}

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} de ${y}`;
}
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 2600);
}
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

// ---------- app state ----------
let allTransactions = []; // realtime cache from Firestore, newest first
let unsubscribeTx = null;
let currentHomeMonth = monthKey(new Date());
let currentHistoryMonth = monthKey(new Date());
let currentTxType = 'expense';

// ---------- screen navigation ----------
function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => hide(s));
  show($(id));
}
function showPage(name) {
  document.querySelectorAll('.page').forEach((p) => hide(p));
  show($(`page-${name}`));
  document.querySelectorAll('.nav-btn[data-page]').forEach((b) => {
    b.classList.toggle('active', b.dataset.page === name);
  });
}

document.querySelectorAll('.nav-btn[data-page]').forEach((btn) => {
  btn.addEventListener('click', () => showPage(btn.dataset.page));
});

// ---------- auth screens ----------
$('btn-show-signup').addEventListener('click', () => showScreen('screen-signup'));
$('btn-back-to-login').addEventListener('click', () => showScreen('screen-login'));

$('form-email-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('login-error').textContent = '';
  try {
    await auth.signInWithEmailAndPassword($('login-email').value.trim(), $('login-password').value);
  } catch (err) {
    $('login-error').textContent = friendlyAuthError(err);
  }
});

$('form-signup').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('signup-error').textContent = '';
  try {
    const cred = await auth.createUserWithEmailAndPassword($('signup-email').value.trim(), $('signup-password').value);
    await cred.user.updateProfile({ displayName: $('signup-name').value.trim() });
  } catch (err) {
    $('signup-error').textContent = friendlyAuthError(err);
  }
});

$('btn-google-login').addEventListener('click', async () => {
  $('login-error').textContent = '';
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  } catch (err) {
    $('login-error').textContent = friendlyAuthError(err);
  }
});

$('btn-forgot-password').addEventListener('click', async () => {
  const email = $('login-email').value.trim();
  if (!email) { $('login-error').textContent = 'Digite seu e-mail acima para receber o link de redefinição.'; return; }
  try {
    await auth.sendPasswordResetEmail(email);
    toast('Enviamos um e-mail para redefinir sua senha.');
  } catch (err) {
    $('login-error').textContent = friendlyAuthError(err);
  }
});

$('btn-logout').addEventListener('click', () => auth.signOut());
$('btn-signout').addEventListener('click', () => auth.signOut());

function friendlyAuthError(err) {
  const map = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-not-found': 'Não encontramos uma conta com esse e-mail.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Já existe uma conta com esse e-mail.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/popup-closed-by-user': 'Login cancelado.',
    'auth/unauthorized-domain': 'Este domínio não está autorizado no Firebase Authentication.',
  };
  return map[err.code] || 'Não foi possível concluir. Tente novamente.';
}

// ---------- auth state ----------
auth.onAuthStateChanged((user) => {
  if (unsubscribeTx) { unsubscribeTx(); unsubscribeTx = null; }
  if (user) {
    $('home-greeting').textContent = `Olá, ${(user.displayName || user.email || '').split(' ')[0]}`;
    $('profile-name').textContent = user.displayName || 'Sem nome';
    $('profile-email').textContent = user.email || '';
    $('profile-avatar').textContent = (user.displayName || user.email || '?').trim()[0].toUpperCase();
    showScreen('screen-app');
    showPage('home');
    listenToTransactions(user.uid);
  } else {
    allTransactions = [];
    showScreen('screen-login');
  }
});

function listenToTransactions(uid) {
  unsubscribeTx = db.collection('users').doc(uid).collection('transactions')
    .orderBy('date', 'desc')
    .onSnapshot((snap) => {
      allTransactions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      populateMonthSelects();
      renderHome();
      renderHistory();
    }, (err) => {
      console.error(err);
      toast('Não foi possível carregar suas transações.');
    });
}

// ---------- month selects ----------
function availableMonths() {
  const keys = new Set(allTransactions.map((t) => t.date.slice(0, 7)));
  keys.add(monthKey(new Date()));
  return Array.from(keys).sort().reverse();
}
function populateMonthSelects() {
  const months = availableMonths();
  for (const select of [$('home-month-select'), $('history-month-select')]) {
    const prev = select.value || (select === $('home-month-select') ? currentHomeMonth : currentHistoryMonth);
    select.innerHTML = months.map((m) => `<option value="${m}">${monthLabel(m)}</option>`).join('');
    select.value = months.includes(prev) ? prev : months[0];
  }
  currentHomeMonth = $('home-month-select').value;
  currentHistoryMonth = $('history-month-select').value;
}
$('home-month-select').addEventListener('change', (e) => { currentHomeMonth = e.target.value; renderHome(); });
$('history-month-select').addEventListener('change', (e) => { currentHistoryMonth = e.target.value; renderHistory(); });
$('history-search').addEventListener('input', () => renderHistory());
$('btn-see-all').addEventListener('click', () => { $('history-month-select').value = currentHomeMonth; currentHistoryMonth = currentHomeMonth; showPage('history'); renderHistory(); });

// ---------- home rendering ----------
function txForMonth(key) {
  return allTransactions.filter((t) => t.date.slice(0, 7) === key);
}

function renderHome() {
  const txs = txForMonth(currentHomeMonth);
  const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  $('balance-total').textContent = BRL.format(income - expense);
  $('balance-income').textContent = BRL.format(income);
  $('balance-expense').textContent = BRL.format(expense);

  const byCategory = {};
  txs.filter((t) => t.type === 'expense').forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });
  renderDonut(byCategory, expense);

  const recent = allTransactions.slice(0, 5);
  $('recent-tx-list').innerHTML = recent.map(renderTxRow).join('') || '<li class="empty-hint">Nenhuma transação ainda.</li>';
  attachDeleteHandlers($('recent-tx-list'));
}

function renderDonut(byCategory, total) {
  const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const donut = $('donut-chart');
  const legend = $('category-legend');
  if (!entries.length || total <= 0) {
    donut.style.background = '#EEF0F4';
    legend.innerHTML = '';
    show($('summary-empty'));
    return;
  }
  hide($('summary-empty'));
  let acc = 0;
  const stops = entries.map(([catId, value]) => {
    const cat = findCategory('expense', catId);
    const pct = (value / total) * 100;
    const from = acc;
    acc += pct;
    return `${cat.color} ${from}% ${acc}%`;
  });
  donut.style.background = `conic-gradient(${stops.join(', ')})`;
  legend.innerHTML = entries.map(([catId, value]) => {
    const cat = findCategory('expense', catId);
    const pct = Math.round((value / total) * 100);
    return `<li><span class="dot" style="background:${cat.color}"></span>${cat.label}<b>${pct}%</b><span class="muted">${BRL.format(value)}</span></li>`;
  }).join('');
}

function renderTxRow(t) {
  const cat = findCategory(t.type, t.category);
  const sign = t.type === 'income' ? '+' : '-';
  const cls = t.type === 'income' ? 'income-value' : 'expense-value';
  return `<li class="tx-row" data-id="${t.id}">
    <span class="tx-icon" style="background:${cat.color}22">${cat.icon}</span>
    <span class="tx-info">
      <span class="tx-desc">${escapeHtml(t.description || cat.label)}</span>
      <span class="muted">${cat.label}</span>
    </span>
    <span class="${cls}">${sign} ${BRL.format(t.amount)}</span>
    <button class="tx-delete" title="Excluir">✕</button>
  </li>`;
}
function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function attachDeleteHandlers(container) {
  container.querySelectorAll('.tx-delete').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.closest('.tx-row').dataset.id;
      if (!confirm('Excluir esta transação?')) return;
      const uid = auth.currentUser.uid;
      await db.collection('users').doc(uid).collection('transactions').doc(id).delete();
    });
  });
}

// ---------- history ----------
function renderHistory() {
  const term = $('history-search').value.trim().toLowerCase();
  const txs = txForMonth(currentHistoryMonth).filter((t) =>
    !term || (t.description || '').toLowerCase().includes(term) || findCategory(t.type, t.category).label.toLowerCase().includes(term)
  );
  const groups = {};
  txs.forEach((t) => { (groups[t.date] = groups[t.date] || []).push(t); });
  const dates = Object.keys(groups).sort().reverse();
  if (!dates.length) {
    $('history-list').innerHTML = '';
    show($('history-empty'));
    return;
  }
  hide($('history-empty'));
  $('history-list').innerHTML = dates.map((date) => `
    <h3 class="history-date">${formatLongDate(date)}</h3>
    <ul class="tx-list">${groups[date].map(renderTxRow).join('')}</ul>
  `).join('');
  attachDeleteHandlers($('history-list'));
}
function formatLongDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  const days = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}, ${days[d.getDay()]}`;
}

// ---------- add transaction ----------
let amountCents = 0;

function resetAddForm() {
  amountCents = 0;
  $('input-amount').value = '';
  $('input-description').value = '';
  $('input-date').value = new Date().toISOString().slice(0, 10);
  $('input-is-installment').checked = false;
  $('input-installment-current').value = 1;
  $('input-installment-total').value = 2;
  hide($('installment-fields'));
  setTxType('expense');
  $('btn-save-tx').disabled = true;
  $('add-tx-error').textContent = '';
  $('input-payment').innerHTML = PAYMENT_METHODS.map((p) => `<option>${p}</option>`).join('');
  updateInstallmentToggleVisibility();
}

function setTxType(type) {
  currentTxType = type;
  $('btn-type-expense').classList.toggle('active', type === 'expense');
  $('btn-type-income').classList.toggle('active', type === 'income');
  const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  $('input-category').innerHTML = cats.map((c) => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');
  document.querySelector('.amount-display').className = `amount-display ${type}`;
  updateInstallmentToggleVisibility();
}
$('btn-type-expense').addEventListener('click', () => setTxType('expense'));
$('btn-type-income').addEventListener('click', () => setTxType('income'));

// ---------- credit card installments ----------
function updateInstallmentToggleVisibility() {
  const isCreditCard = $('input-payment').value === 'Cartão de crédito';
  const canInstall = currentTxType === 'expense' && isCreditCard;
  $('field-installment-toggle').classList.toggle('hidden', !canInstall);
  if (!canInstall) {
    $('input-is-installment').checked = false;
    hide($('installment-fields'));
  }
}
$('input-payment').addEventListener('change', updateInstallmentToggleVisibility);
$('input-is-installment').addEventListener('change', (e) => {
  $('installment-fields').classList.toggle('hidden', !e.target.checked);
});

function addMonthsClamped(dateStr, monthsToAdd) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetIndex = m - 1 + monthsToAdd;
  const targetYear = y + Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(d, lastDay);
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

$('input-amount').addEventListener('input', (e) => {
  const digits = e.target.value.replace(/\D/g, '');
  amountCents = digits ? parseInt(digits, 10) : 0;
  e.target.value = (amountCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  $('btn-save-tx').disabled = amountCents <= 0;
});

$('btn-open-add').addEventListener('click', () => { resetAddForm(); showPage('add'); });
$('btn-close-add').addEventListener('click', () => showPage('home'));

$('form-add-tx').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (amountCents <= 0) return;

  const isInstallment = !$('field-installment-toggle').classList.contains('hidden') && $('input-is-installment').checked;
  const installmentCurrent = Math.max(1, parseInt($('input-installment-current').value, 10) || 1);
  const installmentTotal = Math.max(installmentCurrent, parseInt($('input-installment-total').value, 10) || installmentCurrent);
  if (isInstallment && installmentTotal < installmentCurrent) {
    $('add-tx-error').textContent = 'O total de parcelas precisa ser maior ou igual à parcela atual.';
    return;
  }

  $('btn-save-tx').disabled = true;
  const baseDescription = $('input-description').value.trim();
  const baseData = {
    type: currentTxType,
    amount: amountCents / 100,
    category: $('input-category').value,
    date: $('input-date').value,
    paymentMethod: $('input-payment').value,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    const uid = auth.currentUser.uid;
    const txCollection = db.collection('users').doc(uid).collection('transactions');
    if (isInstallment) {
      const groupId = txCollection.doc().id;
      const batch = db.batch();
      for (let n = installmentCurrent; n <= installmentTotal; n++) {
        const docRef = txCollection.doc();
        batch.set(docRef, {
          ...baseData,
          description: `${baseDescription || 'Compra parcelada'} (parcela ${n}/${installmentTotal})`,
          date: addMonthsClamped(baseData.date, n - installmentCurrent),
          installmentGroupId: groupId,
          installmentIndex: n,
          installmentTotal,
        });
      }
      await batch.commit();
      toast(`${installmentTotal - installmentCurrent + 1} parcelas lançadas!`);
    } else {
      await txCollection.add({ ...baseData, description: baseDescription });
      toast('Transação salva!');
    }
    showPage('home');
  } catch (err) {
    console.error(err);
    $('add-tx-error').textContent = 'Não foi possível salvar. Tente novamente.';
    $('btn-save-tx').disabled = false;
  }
});

resetAddForm();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.error('SW registration failed', err));
  });
}
