/* ============================================================
   AUTH (local only — no server, credentials stored on this
   device inside localStorage. Good for personal/hostel use.)
   ============================================================ */
const AUTH_KEY    = 'hostelAuthAccount';   // { email, password }
const SESSION_KEY = 'hostelAuthSession';   // 'true' when logged in

let isSignupMode = false;

function getAccount() {
  const raw = localStorage.getItem(AUTH_KEY);
  return raw ? JSON.parse(raw) : null;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setAuthError(msg) {
  document.getElementById('authError').textContent = msg || '';
}

function refreshAuthScreenMode() {
  const account = getAccount();
  const titleEl   = document.getElementById('authSubText');
  const btnEl     = document.getElementById('authSubmitBtn');
  const confirmEl = document.getElementById('authConfirmField');
  const switchEl  = document.getElementById('authSwitchText');

  // If no account exists yet, force signup mode
  if (!account) isSignupMode = true;

  if (isSignupMode) {
    titleEl.textContent = 'Create your account to get started';
    btnEl.textContent = 'Create Account';
    confirmEl.style.display = 'flex';
    if (account) {
      switchEl.innerHTML = 'Already have an account? <a id="authSwitchLink">Login</a>';
    } else {
      switchEl.innerHTML = '';
    }
  } else {
    titleEl.textContent = 'Sign in to continue';
    btnEl.textContent = 'Login';
    confirmEl.style.display = 'none';
    switchEl.innerHTML = 'New here? <a id="authSwitchLink">Create an account</a>';
  }

  const link = document.getElementById('authSwitchLink');
  if (link) {
    link.addEventListener('click', () => {
      isSignupMode = !isSignupMode;
      setAuthError('');
      refreshAuthScreenMode();
    });
  }
}

function handleAuthSubmit() {
  setAuthError('');
  const email    = document.getElementById('authEmail').value.trim().toLowerCase();
  const password = document.getElementById('authPassword').value;

  if (!email || !isValidEmail(email)) { setAuthError('Please enter a valid email.'); return; }
  if (!password) { setAuthError('Please enter a password.'); return; }

  const account = getAccount();

  if (isSignupMode) {
    const confirm = document.getElementById('authPasswordConfirm').value;
    if (password.length < 4) { setAuthError('Password must be at least 4 characters.'); return; }
    if (password !== confirm) { setAuthError('Passwords do not match.'); return; }

    localStorage.setItem(AUTH_KEY, JSON.stringify({ email, password }));
    startSession(email);
    return;
  }

  // Login mode
  if (!account) { setAuthError('No account found. Please create one.'); return; }
  if (account.email !== email || account.password !== password) {
    setAuthError('Incorrect email or password.');
    return;
  }
  startSession(email);
}

function startSession(email) {
  sessionStorage.setItem(SESSION_KEY, 'true');
  sessionStorage.setItem('hostelAuthEmail', email);
  showApp(email);
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem('hostelAuthEmail');
  document.getElementById('authEmail').value = '';
  document.getElementById('authPassword').value = '';
  document.getElementById('authPasswordConfirm').value = '';
  isSignupMode = false;
  setAuthError('');
  refreshAuthScreenMode();
  document.getElementById('appMain').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
}

function showApp(email) {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appMain').style.display = 'block';
  document.getElementById('loggedInEmail').textContent = email;
  initApp();
}

function checkExistingSession() {
  const loggedIn = sessionStorage.getItem(SESSION_KEY) === 'true';
  const email    = sessionStorage.getItem('hostelAuthEmail');
  if (loggedIn && email) {
    showApp(email);
  } else {
    refreshAuthScreenMode();
  }
}

document.getElementById('authSubmitBtn').addEventListener('click', handleAuthSubmit);
document.getElementById('logoutBtn').addEventListener('click', logout);
[document.getElementById('authEmail'), document.getElementById('authPassword'), document.getElementById('authPasswordConfirm')]
  .forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') handleAuthSubmit(); }));

checkExistingSession();


/* ============================================================
   MAIN APP
   ============================================================ */
let records = JSON.parse(localStorage.getItem('hostelDebt') || '[]');
let currentFilter = null; // student name currently being viewed, or null = all
let appInitialized = false;

function getAmPmTime() {
  const now = new Date();
  let h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + m + ' ' + ampm;
}

function convertTo12hr(time24) {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + mStr + ' ' + ampm;
}

function initApp() {
  if (appInitialized) {
    renderStudentAccounts();
    renderTable();
    renderOwnAccounts();
    renderOwnTable();
    return;
  }
  appInitialized = true;

  const now = new Date();
  document.getElementById('date').value = now.toISOString().split('T')[0];
  document.getElementById('time').value = now.toTimeString().slice(0, 5);
  document.getElementById('submitBtn').addEventListener('click', addRecord);

  document.getElementById('ownDate').value = now.toISOString().split('T')[0];
  document.getElementById('ownTime').value = now.toTimeString().slice(0, 5);
  document.getElementById('ownSubmitBtn').addEventListener('click', addOwnRecord);
  document.getElementById('myselfToggleBtn').addEventListener('click', openMyselfPage);
  document.getElementById('closeMyselfBtn').addEventListener('click', closeMyselfPage);
  document.getElementById('closeAboutBtn').addEventListener('click', closeAboutModal);
  document.getElementById('footerToggleBtn').addEventListener('click', toggleFooter);

  renderStudentAccounts();
  renderTable();
  renderOwnAccounts();
  renderOwnTable();
}



function toggleFooter() {
  const footer = document.getElementById('siteFooter');
  const arrow  = document.getElementById('footerToggleArrow');
  const isHidden = footer.style.display === 'none' || footer.style.display === '';
  footer.style.display = isHidden ? 'block' : 'none';
  arrow.classList.toggle('rotated', isHidden);
}



function openAboutModal() {
  document.getElementById('aboutModal').style.display = 'flex';
}

function closeAboutModal() {
  document.getElementById('aboutModal').style.display = 'none';
}

function openMyselfPage() {
  document.getElementById('myselfPage').style.display = 'block';
  document.body.style.overflow = 'hidden';
  renderOwnAccounts();
  renderOwnTable();
}

function closeMyselfPage() {
  document.getElementById('myselfPage').style.display = 'none';
  document.body.style.overflow = '';
}

function addRecord() {
  const student = document.getElementById('studentName').value.trim();
  const lender  = document.getElementById('lenderName').value.trim();
  const amount  = parseFloat(document.getElementById('amount').value);
  const date    = document.getElementById('date').value;
  const timeRaw = document.getElementById('time').value;
  const time    = convertTo12hr(timeRaw);
  const reason  = document.getElementById('reason').value.trim();

  if (!student) { alert('Plz enter your name.'); return; }
  if (!lender)  { alert('Plz enter next name.'); return; }
  if (!amount || amount <= 0) { alert('Plz enter a valid amount.'); return; }
  if (!date)    { alert('Plz select a date.'); return; }
  if (!reason)  { alert('Plz enter a reason .'); return; }

  records.unshift({ id: Date.now(), student, lender, amount, date, time, reason });
  save();
  renderStudentAccounts();
  renderTable();
  resetForm();
  showToast();
}

function save() {
  localStorage.setItem('hostelDebt', JSON.stringify(records));
}

function deleteRecord(id) {
  if (!confirm('Delete this record?')) return;
  records = records.filter(r => r.id !== id);
  save();
  renderStudentAccounts();
  renderTable();
}

/* ---- Student Accounts (grouped by Boy's Name field) ---- */
function getStudentGroups() {
  const groups = {}; // key: lowercase name -> { name, total, count }
  records.forEach(r => {
    const key = r.lender.trim().toLowerCase();
    if (!groups[key]) groups[key] = { name: r.lender.trim(), total: 0, count: 0 };
    groups[key].total += r.amount;
    groups[key].count += 1;
  });
  return Object.values(groups).sort((a, b) => b.total - a.total);
}

function renderStudentAccounts() {
  const area  = document.getElementById('studentAccountsArea');
  const badge = document.getElementById('studentCountBadge');
  const groups = getStudentGroups();

  badge.textContent = groups.length + ' Students';

  if (groups.length === 0) {
    area.innerHTML = '<div class="empty-state">No student accounts yet.</div>';
    return;
  }

  let html = '<div class="student-grid">';
  groups.forEach(g => {
    const isActive = currentFilter && currentFilter.toLowerCase() === g.name.toLowerCase();
    html += `<div class="student-account-card${isActive ? ' active' : ''}">
      <div class="student-account-name">${esc(g.name)}</div>
      <div class="student-account-meta">${g.count} ${g.count === 1 ? 'entry' : 'entries'}</div>
      <div class="student-account-total">Rs. ${g.total.toLocaleString('en-PK')}</div>
      <div class="student-account-actions">
        <button class="btn-view" onclick="filterByStudent('${escAttr(g.name)}')">View Ledger</button>
        <button class="btn-student-download" onclick="downloadStudentPDF('${escAttr(g.name)}')">Download</button>
      </div>
    </div>`;
  });
  html += '</div>';
  area.innerHTML = html;
}

function filterByStudent(name) {
  currentFilter = name;
  renderStudentAccounts();
  renderTable();
  document.getElementById('tableArea').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearFilter() {
  currentFilter = null;
  renderStudentAccounts();
  renderTable();
}

/* ---- Records table (respects currentFilter) ---- */
function renderTable() {
  const area   = document.getElementById('tableArea');
  const badge  = document.getElementById('countBadge');
  const bar    = document.getElementById('totalBar');
  const dlBtn  = document.getElementById('downloadAllBtn');
  const clearBtn = document.getElementById('clearFilterBtn');
  const titleEl = document.getElementById('recordsTitle');
  const totalLabelEl = document.getElementById('totalLabel');

  const visibleRecords = currentFilter
    ? records.filter(r => r.lender.trim().toLowerCase() === currentFilter.toLowerCase())
    : records;

  if (currentFilter) {
    titleEl.textContent = currentFilter + "'s Records";
    totalLabelEl.textContent = currentFilter + "'s Total";
    clearBtn.style.display = 'inline-block';
    dlBtn.textContent = 'Download ' + currentFilter + "'s Receipt";
    dlBtn.onclick = () => downloadStudentPDF(currentFilter);
  } else {
    titleEl.textContent = 'All Records';
    totalLabelEl.textContent = 'Total Debt';
    clearBtn.style.display = 'none';
    dlBtn.textContent = 'Download receipts';
    dlBtn.onclick = () => downloadAllPDF();
  }

  badge.textContent = visibleRecords.length + ' Records';

  if (visibleRecords.length === 0) {
    area.innerHTML = '<div class="empty-state">No records added yet.</div>';
    bar.style.display = 'none';
    dlBtn.style.display = 'none';
    return;
  }

  const total = visibleRecords.reduce((s, r) => s + r.amount, 0);
  document.getElementById('totalAmount').textContent = 'Rs. ' + total.toLocaleString('en-PK');
  bar.style.display = 'flex';
  dlBtn.style.display = 'inline-block';

  let rows = '';
  visibleRecords.forEach((r, i) => {
    const serial = visibleRecords.length - i; // oldest record = 1
    rows += `<tr>
      <td class="td-muted">${serial}</td>
      <td class="td-bold">${esc(r.student)}</td>
      <td>${esc(r.lender)}</td>
      <td class="td-amount">Rs. ${r.amount.toLocaleString('en-PK')}</td>
      <td class="td-reason" title="${esc(r.reason)}">${esc(r.reason)}</td>
      <td class="td-muted" style="white-space:nowrap;">${r.date} &nbsp; ${r.time}</td>
      <td><button class="btn-del" onclick="deleteRecord(${r.id})">Delete</button></td>
    </tr>`;
  });

  area.innerHTML = `<div class="table-wrap"><table>
    <thead><tr>
      <th>#</th><th>name</th><th>nextname</th>
      <th>Amount</th><th>Reason</th><th>Date / Time</th><th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function resetForm() {
  // studentName and lenderName intentionally kept
  document.getElementById('amount').value = '';
  document.getElementById('reason').value = '';
  const now = new Date();
  document.getElementById('date').value = now.toISOString().split('T')[0];
  document.getElementById('time').value = now.toTimeString().slice(0, 5);
}

function showToast() {
  const t = document.getElementById('toast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function escAttr(s) {
  return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
}

/* ============================================================
   PDF GENERATION
   ============================================================ */

// Download all records (or the currently filtered set) as one PDF
function downloadAllPDF() {
  const list = currentFilter
    ? records.filter(r => r.lender.trim().toLowerCase() === currentFilter.toLowerCase())
    : records;
  const title = currentFilter ? currentFilter + "'s Debt Receipt" : 'Student Debt Receipt';
  const filePrefix = currentFilter ? currentFilter.replace(/\s+/g, '_') + '_Receipt' : 'Receipt_list_FM';
  buildPDF(list, title, filePrefix);
}

// Download a single student's records only, regardless of current filter
function downloadStudentPDF(studentName) {
  const list = records.filter(r => r.lender.trim().toLowerCase() === studentName.toLowerCase());
  if (list.length === 0) return;
  const title = studentName + "'s Debt Receipt";
  const filePrefix = studentName.replace(/\s+/g, '_') + '_Receipt';
  buildPDF(list, title, filePrefix);
}

function buildPDF(recordsList, titleText, filenamePrefix) {
  if (recordsList.length === 0) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W      = doc.internal.pageSize.getWidth();
  const H      = doc.internal.pageSize.getHeight();
  const margin = 14;
  const today  = new Date().toLocaleDateString('en-PK');
  const total  = recordsList.reduce((s, r) => s + r.amount, 0);

  // Column definitions — reason gets remaining space
  // #, Borrower, Lender, Amount, Date/Time, Reason
  const cols = [
    { x: margin,      w: 10  },  // #
    { x: margin + 10, w: 38  },  // Borrower
    { x: margin + 48, w: 38  },  // Lender
    { x: margin + 86, w: 28  },  // Amount
    { x: margin + 114,w: 28  },  // Date/Time
    { x: margin + 142,w: W - margin - 142 - margin }  // Reason — full remaining width
  ];
  const headers = ['No.', 'Name', "Boy's Name", 'Amount', 'Date / Time', 'Reason'];

  // ---- Page header function (called on each new page) ----
  function pageHeader(isFirst) {
    doc.setFillColor(26, 58, 92);
    doc.rect(0, 0, W, isFirst ? 28 : 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirst ? 16 : 11);
    doc.text(titleText.toUpperCase(), W / 2, isFirst ? 12 : 11, { align: 'center' });
    if (isFirst) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('List of Records   Print Date: ' + today, W / 2, 21, { align: 'center' });
    }
  }

  pageHeader(true);

  // ---- Summary box ----
  doc.setFillColor(255, 245, 245);
  doc.setDrawColor(200, 180, 180);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, 33, W - margin * 2, 12, 2, 2, 'FD');
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Total Records: ' + recordsList.length, margin + 4, 41);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(139, 0, 0);
  doc.setFontSize(9);
  doc.text('Total Debt: Rs. ' + total.toLocaleString('en-PK'), W - margin - 4, 41, { align: 'right' });

  let y = 52;

  // ---- Draw table header row ----
  function drawTableHeader() {
    doc.setFillColor(235, 235, 235);
    doc.rect(margin, y, W - margin * 2, 8, 'F');
    doc.setDrawColor(170, 170, 170);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, W - margin * 2, 8, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    headers.forEach((h, i) => doc.text(h, cols[i].x + 2, y + 5.5));
    y += 10;
  }

  drawTableHeader();

  // ---- Rows ---- (oldest first → serial 1,2,3,4...)
  const orderedRecords = [...recordsList].reverse();
  orderedRecords.forEach((r, idx) => {
    // Calculate row height based on wrapped reason text
    doc.setFontSize(7.5);
    const reasonLines = doc.splitTextToSize(String(r.reason), cols[5].w - 4);
    const rowH = Math.max(9, reasonLines.length * 4.5 + 3);

    // New page check
    if (y + rowH > H - 20) {
      // Footer on current page
      drawPageFooter();
      doc.addPage();
      pageHeader(false);
      y = 24;
      drawTableHeader();
    }

    // Row background
    const bg = idx % 2 === 0 ? [255, 255, 255] : [249, 249, 249];
    doc.setFillColor(...bg);
    doc.rect(margin, y, W - margin * 2, rowH, 'F');
    doc.setDrawColor(215, 215, 215);
    doc.setLineWidth(0.2);
    doc.line(margin, y + rowH, W - margin, y + rowH);

    const midY = y + rowH / 2 + 1.5;

    // #
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text(String(idx + 1), cols[0].x + 2, midY);

    // Borrower
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 26);
    doc.text(doc.splitTextToSize(r.student, cols[1].w - 4), cols[1].x + 2, midY);

    // Lender
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(doc.splitTextToSize(r.lender, cols[2].w - 4), cols[2].x + 2, midY);

    // Amount
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(139, 0, 0);
    doc.text('Rs. ' + r.amount.toLocaleString('en-PK'), cols[3].x + 2, midY);

    // Date / Time
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(r.date, cols[4].x + 2, y + rowH / 2 - 0.5);
    doc.text(r.time, cols[4].x + 2, y + rowH / 2 + 4);

    // Reason — fully wrapped, no truncation
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(26, 26, 26);
    const reasonTopY = y + (rowH - reasonLines.length * 4.5) / 2 + 3;
    doc.text(reasonLines, cols[5].x + 2, reasonTopY);

    y += rowH;
  });

  drawPageFooter();
  doc.save(filenamePrefix + '_' + today.replace(/\//g, '-') + '.pdf');

  function drawPageFooter() {
    doc.setDrawColor(26, 58, 92);
    doc.setLineWidth(0.4);
    doc.line(margin, H - 12, W - margin, H - 12);
    doc.setTextColor(140, 140, 140);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Copyright © M.Faheem Register — ' + today, W / 2, H - 7, { align: 'center' });
  }
}

/* ============================================================
   MY OWN ACCOUNT — money the logged-in user borrowed from others
   (kept in a separate localStorage key from the main records)
   ============================================================ */
let ownRecords = JSON.parse(localStorage.getItem('myOwnDebt') || '[]');
let ownCurrentFilter = null; // person's name currently being viewed, or null = all

function addOwnRecord() {
  const from    = document.getElementById('ownFromName').value.trim();
  const amount  = parseFloat(document.getElementById('ownAmount').value);
  const date    = document.getElementById('ownDate').value;
  const timeRaw = document.getElementById('ownTime').value;
  const time    = convertTo12hr(timeRaw);
  const reason  = document.getElementById('ownReason').value.trim();

  if (!from)   { alert('Plz enter who you borrowed from.'); return; }
  if (!amount || amount <= 0) { alert('Plz enter a valid amount.'); return; }
  if (!date)   { alert('Plz select a date.'); return; }
  if (!reason) { alert('Plz enter a reason.'); return; }

  ownRecords.unshift({ id: Date.now(), from, amount, date, time, reason });
  saveOwn();
  renderOwnAccounts();
  renderOwnTable();
  resetOwnForm();
  showToast();
}

function saveOwn() {
  localStorage.setItem('myOwnDebt', JSON.stringify(ownRecords));
}

function deleteOwnRecord(id) {
  if (!confirm('Delete this record?')) return;
  ownRecords = ownRecords.filter(r => r.id !== id);
  saveOwn();
  renderOwnAccounts();
  renderOwnTable();
}

function resetOwnForm() {
  document.getElementById('ownAmount').value = '';
  document.getElementById('ownReason').value = '';
  const now = new Date();
  document.getElementById('ownDate').value = now.toISOString().split('T')[0];
  document.getElementById('ownTime').value = now.toTimeString().slice(0, 5);
}

/* ---- Grouped by the person the money was borrowed from ---- */
function getOwnGroups() {
  const groups = {};
  ownRecords.forEach(r => {
    const key = r.from.trim().toLowerCase();
    if (!groups[key]) groups[key] = { name: r.from.trim(), total: 0, count: 0 };
    groups[key].total += r.amount;
    groups[key].count += 1;
  });
  return Object.values(groups).sort((a, b) => b.total - a.total);
}

function renderOwnAccounts() {
  const area  = document.getElementById('ownAccountsArea');
  const badge = document.getElementById('ownStudentCountBadge');
  const groups = getOwnGroups();

  badge.textContent = groups.length + ' People';

  if (groups.length === 0) {
    area.innerHTML = '<div class="empty-state">You have not added anyone yet.</div>';
    return;
  }

  let html = '<div class="student-grid">';
  groups.forEach(g => {
    const isActive = ownCurrentFilter && ownCurrentFilter.toLowerCase() === g.name.toLowerCase();
    html += `<div class="student-account-card${isActive ? ' active' : ''}">
      <div class="student-account-name">${esc(g.name)}</div>
      <div class="student-account-meta">${g.count} ${g.count === 1 ? 'entry' : 'entries'}</div>
      <div class="student-account-total">Rs. ${g.total.toLocaleString('en-PK')}</div>
      <div class="student-account-actions">
        <button class="btn-view" onclick="filterByOwnPerson('${escAttr(g.name)}')">View Ledger</button>
        <button class="btn-student-download" onclick="downloadOwnPersonPDF('${escAttr(g.name)}')">Download</button>
      </div>
    </div>`;
  });
  html += '</div>';
  area.innerHTML = html;
}

function filterByOwnPerson(name) {
  ownCurrentFilter = name;
  renderOwnAccounts();
  renderOwnTable();
  document.getElementById('ownTableArea').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearOwnFilter() {
  ownCurrentFilter = null;
  renderOwnAccounts();
  renderOwnTable();
}

function renderOwnTable() {
  const area     = document.getElementById('ownTableArea');
  const badge    = document.getElementById('ownCountBadge');
  const bar      = document.getElementById('ownTotalBar');
  const dlBtn    = document.getElementById('ownDownloadAllBtn');
  const clearBtn = document.getElementById('ownClearFilterBtn');
  const titleEl  = document.getElementById('ownRecordsTitle');
  const totalLabelEl = document.getElementById('ownTotalLabel');

  const visible = ownCurrentFilter
    ? ownRecords.filter(r => r.from.trim().toLowerCase() === ownCurrentFilter.toLowerCase())
    : ownRecords;

  if (ownCurrentFilter) {
    titleEl.textContent = 'Given By ' + ownCurrentFilter;
    totalLabelEl.textContent = 'Total Owed to ' + ownCurrentFilter;
    clearBtn.style.display = 'inline-block';
    dlBtn.textContent = 'Download ' + ownCurrentFilter + "'s Receipt";
    dlBtn.onclick = () => downloadOwnPersonPDF(ownCurrentFilter);
  } else {
    titleEl.textContent = 'My Loan History';
    totalLabelEl.textContent = 'Total Borrowed';
    clearBtn.style.display = 'none';
    dlBtn.textContent = 'Download receipts';
    dlBtn.onclick = () => downloadOwnAllPDF();
  }

  badge.textContent = visible.length + ' Records';

  if (visible.length === 0) {
    area.innerHTML = '<div class="empty-state">No records added yet.</div>';
    bar.style.display = 'none';
    dlBtn.style.display = 'none';
    return;
  }

  const total = visible.reduce((s, r) => s + r.amount, 0);
  document.getElementById('ownTotalAmount').textContent = 'Rs. ' + total.toLocaleString('en-PK');
  bar.style.display = 'flex';
  dlBtn.style.display = 'inline-block';

  let rows = '';
  visible.forEach((r, i) => {
    const serial = visible.length - i;
    rows += `<tr>
      <td class="td-muted">${serial}</td>
      <td class="td-bold">${esc(r.from)}</td>
      <td class="td-amount">Rs. ${r.amount.toLocaleString('en-PK')}</td>
      <td class="td-reason" title="${esc(r.reason)}">${esc(r.reason)}</td>
      <td class="td-muted" style="white-space:nowrap;">${r.date} &nbsp; ${r.time}</td>
      <td><button class="btn-del" onclick="deleteOwnRecord(${r.id})">Delete</button></td>
    </tr>`;
  });

  area.innerHTML = `<div class="table-wrap"><table>
    <thead><tr>
      <th>#</th><th>Given By</th><th>Amount</th><th>Reason</th><th>Date / Time</th><th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

/* ---- PDF for own borrowed money ---- */
function downloadOwnAllPDF() {
  const list = ownCurrentFilter
    ? ownRecords.filter(r => r.from.trim().toLowerCase() === ownCurrentFilter.toLowerCase())
    : ownRecords;
  const title = ownCurrentFilter ? 'Given By ' + ownCurrentFilter : 'My Loans Receipt';
  const filePrefix = ownCurrentFilter ? ownCurrentFilter.replace(/\s+/g, '_') + '_Owed_Receipt' : 'My_Loans_Receipt';
  buildOwnPDF(list, title, filePrefix);
}

function downloadOwnPersonPDF(personName) {
  const list = ownRecords.filter(r => r.from.trim().toLowerCase() === personName.toLowerCase());
  if (list.length === 0) return;
  const title = 'Given By ' + personName;
  const filePrefix = personName.replace(/\s+/g, '_') + '_Owed_Receipt';
  buildOwnPDF(list, title, filePrefix);
}

function buildOwnPDF(recordsList, titleText, filenamePrefix) {
  if (recordsList.length === 0) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W      = doc.internal.pageSize.getWidth();
  const H      = doc.internal.pageSize.getHeight();
  const margin = 14;
  const today  = new Date().toLocaleDateString('en-PK');
  const total  = recordsList.reduce((s, r) => s + r.amount, 0);

  // Columns: #, Given By, Amount, Date/Time, Reason
  const cols = [
    { x: margin,       w: 10 },
    { x: margin + 10,  w: 46 },
    { x: margin + 56,  w: 30 },
    { x: margin + 86,  w: 30 },
    { x: margin + 116, w: W - margin - 116 - margin }
  ];
  const headers = ['No.', 'Given By', 'Amount', 'Date / Time', 'Reason'];

  function pageHeader(isFirst) {
    doc.setFillColor(26, 58, 92);
    doc.rect(0, 0, W, isFirst ? 28 : 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirst ? 16 : 11);
    doc.text(titleText.toUpperCase(), W / 2, isFirst ? 12 : 11, { align: 'center' });
    if (isFirst) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('List of Records   Print Date: ' + today, W / 2, 21, { align: 'center' });
    }
  }

  pageHeader(true);

  doc.setFillColor(255, 245, 245);
  doc.setDrawColor(200, 180, 180);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, 33, W - margin * 2, 12, 2, 2, 'FD');
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Total Records: ' + recordsList.length, margin + 4, 41);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(139, 0, 0);
  doc.setFontSize(9);
  doc.text('Total Borrowed: Rs. ' + total.toLocaleString('en-PK'), W - margin - 4, 41, { align: 'right' });

  let y = 52;

  function drawTableHeader() {
    doc.setFillColor(235, 235, 235);
    doc.rect(margin, y, W - margin * 2, 8, 'F');
    doc.setDrawColor(170, 170, 170);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, W - margin * 2, 8, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    headers.forEach((h, i) => doc.text(h, cols[i].x + 2, y + 5.5));
    y += 10;
  }

  drawTableHeader();

  const orderedRecords = [...recordsList].reverse();
  orderedRecords.forEach((r, idx) => {
    doc.setFontSize(7.5);
    const reasonLines = doc.splitTextToSize(String(r.reason), cols[4].w - 4);
    const rowH = Math.max(9, reasonLines.length * 4.5 + 3);

    if (y + rowH > H - 20) {
      drawPageFooter();
      doc.addPage();
      pageHeader(false);
      y = 24;
      drawTableHeader();
    }

    const bg = idx % 2 === 0 ? [255, 255, 255] : [249, 249, 249];
    doc.setFillColor(...bg);
    doc.rect(margin, y, W - margin * 2, rowH, 'F');
    doc.setDrawColor(215, 215, 215);
    doc.setLineWidth(0.2);
    doc.line(margin, y + rowH, W - margin, y + rowH);

    const midY = y + rowH / 2 + 1.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text(String(idx + 1), cols[0].x + 2, midY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 26);
    doc.text(doc.splitTextToSize(r.from, cols[1].w - 4), cols[1].x + 2, midY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(139, 0, 0);
    doc.text('Rs. ' + r.amount.toLocaleString('en-PK'), cols[2].x + 2, midY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(r.date, cols[3].x + 2, y + rowH / 2 - 0.5);
    doc.text(r.time, cols[3].x + 2, y + rowH / 2 + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(26, 26, 26);
    const reasonTopY = y + (rowH - reasonLines.length * 4.5) / 2 + 3;
    doc.text(reasonLines, cols[4].x + 2, reasonTopY);

    y += rowH;
  });

  drawPageFooter();
  doc.save(filenamePrefix + '_' + today.replace(/\//g, '-') + '.pdf');

  function drawPageFooter() {
    doc.setDrawColor(26, 58, 92);
    doc.setLineWidth(0.4);
    doc.line(margin, H - 12, W - margin, H - 12);
    doc.setTextColor(140, 140, 140);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Copyright © M.Faheem Register — ' + today, W / 2, H - 7, { align: 'center' });
  }
}