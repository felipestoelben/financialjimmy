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
function shiftMonthKey(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const idx = (m - 1) + delta;
  const ny = y + Math.floor(idx / 12);
  const nm = ((idx % 12) + 12) % 12;
  return `${ny}-${String(nm + 1).padStart(2, '0')}`;
}
function addMonthsClamped(dateStr, monthsToAdd) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetIndex = m - 1 + monthsToAdd;
  const targetYear = y + Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(d, lastDay);
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

// ---------- preferences (theme + privacy) ----------
const THEME_KEY = 'jimmy_theme';
const HIDE_VALUES_KEY = 'jimmy_hide_values';
let valuesHidden = localStorage.getItem(HIDE_VALUES_KEY) === '1';

function fmtBRL(amount) {
  return valuesHidden ? 'R$ ••••' : BRL.format(amount);
}

function applySavedTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  const isDark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  $('input-dark-mode').checked = isDark;
}
$('input-dark-mode').addEventListener('change', (e) => {
  const theme = e.target.checked ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
});

function applyHideValuesUI() {
  const btn = $('btn-toggle-hide-values');
  btn.textContent = valuesHidden ? '🙈' : '👁';
  btn.classList.toggle('is-hidden', valuesHidden);
  $('input-hide-values').checked = valuesHidden;
}
function setValuesHidden(hidden) {
  valuesHidden = hidden;
  localStorage.setItem(HIDE_VALUES_KEY, hidden ? '1' : '0');
  applyHideValuesUI();
  renderHome();
  renderHistory();
}
$('btn-toggle-hide-values').addEventListener('click', () => setValuesHidden(!valuesHidden));
$('input-hide-values').addEventListener('change', (e) => setValuesHidden(e.target.checked));

applySavedTheme();
applyHideValuesUI();

// ---------- app state ----------
let allTransactions = []; // realtime cache from Firestore, newest first
let unsubscribeTx = null;
let currentHomeMonth = monthKey(new Date());
let currentHistoryMonth = monthKey(new Date());
let currentTxType = 'expense';
let paymentMode = 'avista';
let editingTxId = null;

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
      topUpRecurringSeries().catch((err) => console.error('Falha ao renovar assinaturas recorrentes', err));
    }, (err) => {
      console.error(err);
      toast('Não foi possível carregar suas transações.');
    });
}

// ---------- recurring subscriptions ----------
const RECURRING_LOOKAHEAD_MONTHS = 12;
const RECURRING_TOPUP_THRESHOLD_MONTHS = 6;

async function topUpRecurringSeries() {
  const latestByGroup = {};
  allTransactions.forEach((t) => {
    if (!t.isRecurring || !t.recurringGroupId) return;
    if (!latestByGroup[t.recurringGroupId] || t.date > latestByGroup[t.recurringGroupId].date) {
      latestByGroup[t.recurringGroupId] = t;
    }
  });
  const thresholdKey = shiftMonthKey(monthKey(new Date()), RECURRING_TOPUP_THRESHOLD_MONTHS);
  const groupsNeedingTopUp = Object.values(latestByGroup).filter((t) => t.date.slice(0, 7) < thresholdKey);
  if (!groupsNeedingTopUp.length) return;

  const uid = auth.currentUser.uid;
  const txCollection = db.collection('users').doc(uid).collection('transactions');
  const batch = db.batch();
  groupsNeedingTopUp.forEach((latest) => {
    for (let n = 1; n <= RECURRING_LOOKAHEAD_MONTHS; n++) {
      const docRef = txCollection.doc();
      batch.set(docRef, {
        type: latest.type,
        category: latest.category,
        paymentMethod: latest.paymentMethod,
        amount: latest.amount,
        description: latest.description,
        date: addMonthsClamped(latest.date, n),
        isRecurring: true,
        recurringGroupId: latest.recurringGroupId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
  await batch.commit();
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
  const invested = txs.filter((t) => t.type === 'investment').reduce((s, t) => s + t.amount, 0);
  $('balance-total').textContent = fmtBRL(income - expense - invested);
  $('balance-income').textContent = fmtBRL(income);
  $('balance-expense').textContent = fmtBRL(expense);

  $('invest-month-label').textContent = monthLabel(currentHomeMonth);
  $('invest-month').textContent = fmtBRL(invested);
  const totalInvested = allTransactions.filter((t) => t.type === 'investment').reduce((s, t) => s + t.amount, 0);
  $('invest-total').textContent = fmtBRL(totalInvested);

  const nextKey = shiftMonthKey(currentHomeMonth, 1);
  $('forecast-month-label').textContent = monthLabel(nextKey);
  const nextExpense = txForMonth(nextKey).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  $('forecast-next-month').textContent = fmtBRL(nextExpense);

  const byCategory = {};
  txs.filter((t) => t.type === 'expense').forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });
  renderDonut(byCategory, expense);

  const recent = allTransactions.slice(0, 5);
  $('recent-tx-list').innerHTML = recent.map(renderTxRow).join('') || '<li class="empty-hint">Nenhuma transação ainda.</li>';
  attachTxRowHandlers($('recent-tx-list'));
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
    return `<li><span class="dot" style="background:${cat.color}"></span>${cat.label}<b>${pct}%</b><span class="muted">${fmtBRL(value)}</span></li>`;
  }).join('');
}

function renderTxRow(t) {
  const cat = findCategory(t.type, t.category);
  const sign = t.type === 'income' ? '+' : '-';
  const cls = t.type === 'income' ? 'income-value' : t.type === 'investment' ? 'investment-value' : 'expense-value';
  const recurringTag = t.isRecurring ? ' · 🔁 Recorrente' : '';
  return `<li class="tx-row" data-id="${t.id}">
    <span class="tx-icon" style="background:${cat.color}22">${cat.icon}</span>
    <span class="tx-info">
      <span class="tx-desc">${escapeHtml(t.description || cat.label)}</span>
      <span class="muted">${cat.label}${recurringTag}</span>
    </span>
    <span class="${cls}">${sign} ${fmtBRL(t.amount)}</span>
    <button class="tx-delete" title="Excluir">✕</button>
  </li>`;
}
function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function attachTxRowHandlers(container) {
  container.querySelectorAll('.tx-row').forEach((row) => {
    row.addEventListener('click', () => openEditTransaction(row.dataset.id));
  });
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
  attachTxRowHandlers($('history-list'));
}
function formatLongDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  const days = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}, ${days[d.getDay()]}`;
}

// ---------- add / edit transaction ----------
let amountCents = 0;

function resetAddForm() {
  editingTxId = null;
  amountCents = 0;
  $('input-amount').value = '';
  $('input-description').value = '';
  $('input-date').value = new Date().toISOString().slice(0, 10);
  $('input-installment-total').value = 2;
  $('input-is-recurring').checked = false;
  setPaymentMode('avista');
  setTxType('expense');
  $('btn-save-tx').disabled = true;
  $('btn-save-tx').textContent = 'Salvar transação';
  $('add-page-title').textContent = 'Nova transação';
  $('add-tx-error').textContent = '';
  $('input-payment').innerHTML = PAYMENT_METHODS.map((p) => `<option>${p}</option>`).join('');
  updatePaymentModeVisibility();
}

function setTxType(type) {
  currentTxType = type;
  $('btn-type-expense').classList.toggle('active', type === 'expense');
  $('btn-type-income').classList.toggle('active', type === 'income');
  $('btn-type-investment').classList.toggle('active', type === 'investment');
  const cats = categoriesForType(type);
  $('input-category').innerHTML = cats.map((c) => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');
  document.querySelector('.amount-display').className = `amount-display ${type}`;
  updatePaymentModeVisibility();
  updateRecurringToggleVisibility();
}
$('btn-type-expense').addEventListener('click', () => setTxType('expense'));
$('btn-type-income').addEventListener('click', () => setTxType('income'));
$('btn-type-investment').addEventListener('click', () => setTxType('investment'));

// ---------- credit card installments (à vista / parcelado) ----------
function setPaymentMode(mode) {
  paymentMode = mode;
  $('btn-mode-avista').classList.toggle('active', mode === 'avista');
  $('btn-mode-parcelado').classList.toggle('active', mode === 'parcelado');
  $('installment-fields').classList.toggle('hidden', mode !== 'parcelado');
  $('label-date').textContent = mode === 'parcelado' ? 'Data da 1ª parcela' : 'Data';
}
$('btn-mode-avista').addEventListener('click', () => setPaymentMode('avista'));
$('btn-mode-parcelado').addEventListener('click', () => {
  $('input-is-recurring').checked = false;
  setPaymentMode('parcelado');
});

function updatePaymentModeVisibility() {
  const isCreditCard = $('input-payment').value === 'Cartão de crédito';
  const isRecurring = $('input-is-recurring').checked;
  const canInstall = currentTxType === 'expense' && isCreditCard && editingTxId === null && !isRecurring;
  $('field-payment-mode').classList.toggle('hidden', !canInstall);
  if (!canInstall) setPaymentMode('avista');
}
$('input-payment').addEventListener('change', updatePaymentModeVisibility);

function updateRecurringToggleVisibility() {
  const canRecur = currentTxType === 'expense' && editingTxId === null;
  $('field-recurring-toggle').classList.toggle('hidden', !canRecur);
  if (!canRecur) $('input-is-recurring').checked = false;
}
$('input-is-recurring').addEventListener('change', () => updatePaymentModeVisibility());

$('input-amount').addEventListener('input', (e) => {
  const digits = e.target.value.replace(/\D/g, '');
  amountCents = digits ? parseInt(digits, 10) : 0;
  e.target.value = (amountCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  $('btn-save-tx').disabled = amountCents <= 0;
});

$('btn-open-add').addEventListener('click', () => { resetAddForm(); showPage('add'); });
$('btn-close-add').addEventListener('click', () => showPage('home'));

function openEditTransaction(id) {
  const t = allTransactions.find((x) => x.id === id);
  if (!t) return;
  resetAddForm();
  editingTxId = id;
  setTxType(t.type);
  $('input-category').value = t.category;
  $('input-description').value = t.description || '';
  amountCents = Math.round(t.amount * 100);
  $('input-amount').value = (amountCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  $('input-date').value = t.date;
  $('input-payment').value = t.paymentMethod;
  updatePaymentModeVisibility();
  updateRecurringToggleVisibility();
  $('btn-save-tx').disabled = false;
  $('add-page-title').textContent = 'Editar transação';
  $('btn-save-tx').textContent = 'Salvar alterações';
  showPage('add');
}

$('form-add-tx').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (amountCents <= 0) return;

  const isInstallment = !editingTxId && !$('field-payment-mode').classList.contains('hidden') && paymentMode === 'parcelado';
  const installmentTotal = Math.max(2, parseInt($('input-installment-total').value, 10) || 2);
  const isRecurring = !editingTxId && !$('field-recurring-toggle').classList.contains('hidden') && $('input-is-recurring').checked;

  $('btn-save-tx').disabled = true;
  const baseDescription = $('input-description').value.trim();
  const baseDate = $('input-date').value;
  const baseData = {
    type: currentTxType,
    category: $('input-category').value,
    paymentMethod: $('input-payment').value,
  };

  try {
    const uid = auth.currentUser.uid;
    const txCollection = db.collection('users').doc(uid).collection('transactions');

    if (editingTxId) {
      await txCollection.doc(editingTxId).update({
        ...baseData,
        amount: amountCents / 100,
        description: baseDescription,
        date: baseDate,
      });
      toast('Transação atualizada!');
    } else if (isInstallment) {
      const groupId = txCollection.doc().id;
      const perBaseCents = Math.floor(amountCents / installmentTotal);
      const remainder = amountCents - perBaseCents * installmentTotal;
      const batch = db.batch();
      for (let n = 0; n < installmentTotal; n++) {
        const cents = perBaseCents + (n < remainder ? 1 : 0);
        const docRef = txCollection.doc();
        batch.set(docRef, {
          ...baseData,
          amount: cents / 100,
          description: `${baseDescription || 'Compra parcelada'} (parcela ${n + 1}/${installmentTotal})`,
          date: addMonthsClamped(baseDate, n),
          installmentGroupId: groupId,
          installmentIndex: n + 1,
          installmentTotal,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
      toast(`${installmentTotal} parcelas lançadas!`);
    } else if (isRecurring) {
      const groupId = txCollection.doc().id;
      const batch = db.batch();
      for (let n = 0; n < RECURRING_LOOKAHEAD_MONTHS; n++) {
        const docRef = txCollection.doc();
        batch.set(docRef, {
          ...baseData,
          amount: amountCents / 100,
          description: baseDescription || 'Assinatura',
          date: addMonthsClamped(baseDate, n),
          isRecurring: true,
          recurringGroupId: groupId,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
      toast('Assinatura lançada para os próximos 12 meses!');
    } else {
      await txCollection.add({
        ...baseData,
        amount: amountCents / 100,
        description: baseDescription,
        date: baseDate,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
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
