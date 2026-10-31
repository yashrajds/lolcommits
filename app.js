/* ─────────────────────────────────────────────────────────────────
   lolcommits — app.js
   Pure-browser GitHub auto-commit tool.
   All state is stored in localStorage.
   Commits are made via the GitHub Contents API.
───────────────────────────────────────────────────────────────── */

'use strict';

// ── Constants ─────────────────────────────────────────────────────
const LS = {
  TOKEN:    'lc_token',
  OWNER:    'lc_owner',
  REPO:     'lc_repo',
  BRANCH:   'lc_branch',
  MIN:      'lc_min',
  MAX:      'lc_max',
  START:    'lc_start',
  END:      'lc_end',
  MESSAGES: 'lc_messages',
  AUTO:     'lc_auto',
  SCHEDULE: 'lc_schedule',      // JSON array of today's scheduled times (ms)
  LOG:      'lc_log',           // JSON array of commit log entries
};

// ── DOM refs ──────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const tokenInput      = $('tokenInput');
const eyeBtn          = $('eyeBtn');
const saveTokenBtn    = $('saveTokenBtn');
const tokenStatus     = $('tokenStatus');
const repoOwner       = $('repoOwner');
const repoName        = $('repoName');
const branchName      = $('branchName');
const minCommits      = $('minCommits');
const maxCommits      = $('maxCommits');
const startHour       = $('startHour');
const endHour         = $('endHour');
const commitMessages  = $('commitMessages');
const autoToggle      = $('autoToggle');
const nextCommitBadge = $('nextCommitBadge');
const nextCommitTime  = $('nextCommitTime');
const testCommitBtn   = $('testCommitBtn');
const manualCommitBtn = $('manualCommitBtn');
const manualModal     = $('manualModal');
const cancelManualBtn = $('cancelManualBtn');
const confirmManualBtn= $('confirmManualBtn');
const manualMessage   = $('manualMessage');
const commitsList     = $('commitsList');
const commitCount     = $('commitCount');
const commitsDate     = $('commitsDate');
const refreshCommitsBtn = $('refreshCommitsBtn');
const statusText      = $('statusText');
const statusPill      = $('statusPill');
const toastContainer  = $('toastContainer');

// ── State ─────────────────────────────────────────────────────────
let autoTimers = [];   // setTimeouts for today's scheduled commits

// ── Helpers ───────────────────────────────────────────────────────
function save(key, val) { localStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : val); }
function load(key, fallback = '') {
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  try { return JSON.parse(v); } catch { return v; }
}

function toast(msg, type = 'info', dur = 3500) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  toastContainer.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'slideOut .3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, dur);
}

function setStatus(label, type = 'idle') {
  statusText.textContent = label;
  const dot = statusPill.querySelector('.status-dot');
  dot.className = 'status-dot ' + type;
}

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(a, b)   { return Math.floor(Math.random() * (b - a + 1)) + a; }

function fmt(ms) {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ── Persist settings ──────────────────────────────────────────────
function saveSettings() {
  save(LS.OWNER,    repoOwner.value.trim());
  save(LS.REPO,     repoName.value.trim());
  save(LS.BRANCH,   branchName.value.trim() || 'main');
  save(LS.MIN,      minCommits.value);
  save(LS.MAX,      maxCommits.value);
  save(LS.START,    startHour.value);
  save(LS.END,      endHour.value);
  save(LS.MESSAGES, commitMessages.value);
}

function loadSettings() {
  tokenInput.value       = load(LS.TOKEN);
  repoOwner.value        = load(LS.OWNER);
  repoName.value         = load(LS.REPO);
  branchName.value       = load(LS.BRANCH, 'main');
  minCommits.value       = load(LS.MIN,  1);
  maxCommits.value       = load(LS.MAX,  5);
  startHour.value        = load(LS.START, 9);
  endHour.value          = load(LS.END,  22);
  commitMessages.value   = load(LS.MESSAGES, 'Update README\nfix typo\nrefactor code\nadd documentation\nminor improvements\ncleanup\nstyle tweaks');
  autoToggle.checked     = load(LS.AUTO, false) === true || load(LS.AUTO) === 'true';
}

// ── GitHub API ────────────────────────────────────────────────────
async function ghRequest(path, method = 'GET', body = null) {
  const token = load(LS.TOKEN);
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

async function verifyToken() {
  try {
    const user = await ghRequest('/user');
    tokenStatus.className = 'token-status ok';
    tokenStatus.textContent = `✓ Authenticated as @${user.login}`;
    tokenStatus.classList.remove('hidden');
    return true;
  } catch (e) {
    tokenStatus.className = 'token-status error';
    tokenStatus.textContent = `✗ ${e.message}`;
    tokenStatus.classList.remove('hidden');
    return false;
  }
}

async function makeCommit(message, type = 'auto') {
  const owner  = load(LS.OWNER);
  const repo   = load(LS.REPO);
  const branch = load(LS.BRANCH, 'main');

  if (!owner || !repo) {
    toast('Set owner & repo name first!', 'error');
    return false;
  }

  setStatus('committing…', 'running');

  try {
    // 1. Get HEAD SHA
    const ref = await ghRequest(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
    const headSha = ref.object.sha;

    // 2. Get tree SHA
    const commit = await ghRequest(`/repos/${owner}/${repo}/git/commits/${headSha}`);
    const treeSha = commit.tree.sha;

    // 3. Create blob with timestamp content
    const content = btoa(`lolcommits ${new Date().toISOString()}\n${Math.random()}`);
    const blob = await ghRequest(`/repos/${owner}/${repo}/git/blobs`, 'POST', {
      content, encoding: 'base64',
    });

    // 4. Create tree
    const tree = await ghRequest(`/repos/${owner}/${repo}/git/trees`, 'POST', {
      base_tree: treeSha,
      tree: [{ path: '.lolcommits', mode: '100644', type: 'blob', sha: blob.sha }],
    });

    // 5. Create commit
    const newCommit = await ghRequest(`/repos/${owner}/${repo}/git/commits`, 'POST', {
      message,
      tree: tree.sha,
      parents: [headSha],
    });

    // 6. Update ref
    await ghRequest(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, 'PATCH', {
      sha: newCommit.sha,
      force: false,
    });

    // Log it
    const logEntry = {
      sha: newCommit.sha.slice(0, 7),
      message,
      type,
      time: Date.now(),
      today: todayKey(),
    };
    const log = load(LS.LOG, []);
    log.unshift(logEntry);
    save(LS.LOG, log.slice(0, 200)); // keep last 200

    setStatus('idle', 'idle');
    renderCommits();
    toast(`✅ Committed: "${message}"`, 'success');
    return true;

  } catch (e) {
    setStatus('error', 'error');
    toast(`❌ Commit failed: ${e.message}`, 'error', 5000);
    setTimeout(() => setStatus('idle', 'idle'), 3000);
    return false;
  }
}

// ── Today's commits UI ────────────────────────────────────────────
function renderCommits() {
  const today = todayKey();
  const now = new Date();
  commitsDate.textContent = now.toLocaleDateString([], {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const log = load(LS.LOG, []);
  const todaysLog = log.filter(e => e.today === today);

  commitCount.textContent = todaysLog.length;

  if (todaysLog.length === 0) {
    commitsList.innerHTML = `
      <div class="empty-state">
        <span>🌱</span>
        <p>No commits yet today — hit Test Commit or enable auto-commit!</p>
      </div>`;
    return;
  }

  commitsList.innerHTML = todaysLog.map(e => {
    const typeTag = e.type === 'auto'
      ? '<span class="commit-type-tag tag-auto">auto</span>'
      : e.type === 'test'
      ? '<span class="commit-type-tag tag-test">test</span>'
      : '<span class="commit-type-tag tag-manual">manual</span>';
    return `
      <div class="commit-item">
        <span class="commit-icon">${e.type === 'auto' ? '🤖' : e.type === 'test' ? '🧪' : '✍️'}</span>
        <div class="commit-info">
          <div class="commit-msg">${escHtml(e.message)}</div>
          <div class="commit-meta">
            <span class="commit-sha">${e.sha}</span>
            <span>${new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            ${typeTag}
          </div>
        </div>
      </div>`;
  }).join('');
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Auto-commit scheduler ─────────────────────────────────────────
function pickMessages() {
  const raw = commitMessages.value.trim();
  return raw.split('\n').map(l => l.trim()).filter(Boolean);
}

function scheduleToday() {
  // Clear existing timers
  autoTimers.forEach(clearTimeout);
  autoTimers = [];

  if (!autoToggle.checked) {
    nextCommitBadge.classList.add('hidden');
    save(LS.AUTO, false);
    return;
  }

  save(LS.AUTO, true);
  saveSettings();

  const min  = parseInt(minCommits.value) || 1;
  const max  = parseInt(maxCommits.value) || 5;
  const sH   = parseInt(startHour.value)  || 9;
  const eH   = parseInt(endHour.value)    || 22;
  const msgs = pickMessages();

  if (!msgs.length) { toast('Add at least one commit message!', 'error'); return; }

  const now       = Date.now();
  const todayDate = new Date();
  const dayStart  = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), sH, 0, 0, 0).getTime();
  const dayEnd    = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), eH, 59, 59, 0).getTime();

  const count = randInt(min, max);
  const times = [];

  for (let i = 0; i < count; i++) {
    let t;
    let tries = 0;
    do {
      t = dayStart + Math.random() * (dayEnd - dayStart);
      tries++;
    } while (t <= now + 5000 && tries < 50);
    if (t > now + 5000) times.push(t);
  }

  times.sort((a, b) => a - b);
  save(LS.SCHEDULE, times);

  if (times.length === 0) {
    toast('No future commit windows today. Times will reschedule tomorrow.', 'info');
    nextCommitBadge.classList.add('hidden');
    return;
  }

  nextCommitBadge.classList.remove('hidden');
  nextCommitTime.textContent = fmt(times[0]);

  times.forEach((t, idx) => {
    const delay = t - now;
    const msg = randomItem(msgs);
    const timer = setTimeout(async () => {
      await makeCommit(msg, 'auto');
      // update next
      const remaining = times.slice(idx + 1);
      if (remaining.length) {
        nextCommitTime.textContent = fmt(remaining[0]);
      } else {
        nextCommitBadge.classList.add('hidden');
        toast('All scheduled commits for today are done! 🎉', 'success', 5000);
      }
    }, delay);
    autoTimers.push(timer);
  });

  toast(`📅 Scheduled ${times.length} commit${times.length > 1 ? 's' : ''} today`, 'info');
}

// ── Event listeners ───────────────────────────────────────────────

// Show/hide token
eyeBtn.addEventListener('click', () => {
  tokenInput.type = tokenInput.type === 'password' ? 'text' : 'password';
});

// Save token + verify
saveTokenBtn.addEventListener('click', async () => {
  const tok = tokenInput.value.trim();
  if (!tok) { toast('Enter a token first!', 'error'); return; }
  save(LS.TOKEN, tok);
  saveSettings();
  saveTokenBtn.disabled = true;
  saveTokenBtn.textContent = 'Verifying…';
  const ok = await verifyToken();
  saveTokenBtn.disabled = false;
  saveTokenBtn.textContent = 'Save Token';
  if (ok) {
    toast('Token saved & verified ✓', 'success');
    renderCommits();
  }
});

// Auto-toggle
autoToggle.addEventListener('change', () => {
  scheduleToday();
});

// Test commit
testCommitBtn.addEventListener('click', async () => {
  const msgs = pickMessages();
  const msg = msgs.length ? randomItem(msgs) : 'test commit';
  testCommitBtn.disabled = true;
  await makeCommit(`[test] ${msg}`, 'test');
  testCommitBtn.disabled = false;
});

// Manual commit
manualCommitBtn.addEventListener('click', () => {
  manualMessage.value = '';
  manualModal.classList.remove('hidden');
  setTimeout(() => manualMessage.focus(), 50);
});
cancelManualBtn.addEventListener('click', () => manualModal.classList.add('hidden'));
manualModal.addEventListener('click', e => { if (e.target === manualModal) manualModal.classList.add('hidden'); });
manualMessage.addEventListener('keydown', e => { if (e.key === 'Enter') confirmManualBtn.click(); });

confirmManualBtn.addEventListener('click', async () => {
  const msg = manualMessage.value.trim();
  if (!msg) { toast('Enter a commit message!', 'error'); return; }
  confirmManualBtn.disabled = true;
  manualModal.classList.add('hidden');
  await makeCommit(msg, 'manual');
  confirmManualBtn.disabled = false;
});

// Refresh commits
refreshCommitsBtn.addEventListener('click', renderCommits);

// Persist settings on change
[repoOwner, repoName, branchName, minCommits, maxCommits, startHour, endHour, commitMessages]
  .forEach(el => el.addEventListener('change', saveSettings));

// ── Init ──────────────────────────────────────────────────────────
function init() {
  loadSettings();
  renderCommits();

  // Show token status if token present
  if (load(LS.TOKEN)) {
    verifyToken();
  }

  // Re-arm auto scheduler if it was on
  if (load(LS.AUTO) === true || load(LS.AUTO) === 'true') {
    scheduleToday();
  }

  setStatus('idle', 'idle');
}

init();
