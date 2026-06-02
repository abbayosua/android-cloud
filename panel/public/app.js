const API = '/api/adb';

function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  setTimeout(() => el.classList.add('hidden'), 3000);
}

async function api(path, opts = {}) {
  try {
    const r = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    return await r.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Tab switching ──
document.querySelectorAll('.tb-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tb-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const tab = document.getElementById('tab-' + btn.dataset.tab);
    if (tab) tab.classList.add('active');
  });
});

// ── Status ──
async function checkStatus() {
  const info = await api('/info');
  const dot = document.getElementById('status-dot');
  const txt = document.getElementById('status-text');

  if (info.boot_completed) {
    dot.className = 'status-dot connected';
    txt.textContent = `${info['build.version.release'] || 'Android'} • ${info['product.model'] || ''}`;
  } else if (info.ok === false) {
    dot.className = 'status-dot disconnected';
    txt.textContent = 'disconnected';
  } else {
    dot.className = 'status-dot connecting';
    txt.textContent = 'booting...';
  }
}
setInterval(checkStatus, 5000);
checkStatus();

// ── Connect ADB on load ──
fetch(`${API}/connect`, { method: 'POST' }).catch(() => {});

// ── Apps tab ──
async function loadApps() {
  const grid = document.getElementById('apps-grid');
  grid.innerHTML = '<p style="padding:20px;color:var(--text-dim)">Loading...</p>';

  const apps = await api('/apps');
  if (!Array.isArray(apps)) {
    grid.innerHTML = '<p style="padding:20px;color:var(--red)">Failed to load apps</p>';
    return;
  }

  grid.innerHTML = '';
  apps.forEach(app => {
    const card = document.createElement('div');
    card.className = 'app-card';
    card.innerHTML = `
      <div class="app-icon">📱</div>
      <div class="app-name">${app.name}</div>
      <div class="app-pkg">${app.package}</div>
    `;
    card.addEventListener('click', () => launchApp(app));
    grid.appendChild(card);
  });
}

async function launchApp(app) {
  toast(`Launching ${app.name}...`);
  const r = await api('/launch', {
    method: 'POST',
    body: JSON.stringify({ package: app.package, activity: app.activity }),
  });
  if (r.ok) {
    toast(`✅ ${app.name} launched`);
    // Switch to screen tab
    document.querySelector('[data-tab="screen"]').click();
  } else {
    toast(`❌ ${r.error}`, 'error');
  }
}

document.getElementById('refresh-apps')?.addEventListener('click', loadApps);

// ── Install tab ──
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) uploadAPK(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files.length) uploadAPK(fileInput.files[0]);
});

async function uploadAPK(file) {
  const log = document.getElementById('install-log');
  log.textContent = `Uploading ${file.name}...`;

  const form = new FormData();
  form.append('apk', file);

  try {
    const r = await fetch(`${API}/install`, { method: 'POST', body: form });
    const data = await r.json();
    log.textContent = data.output || (data.ok ? 'Success' : 'Failed');
    toast(data.ok ? '✅ APK installed' : '❌ Install failed', data.ok ? 'success' : 'error');
    if (data.ok) loadApps();
  } catch (e) {
    log.textContent = `Error: ${e.message}`;
    toast('❌ Upload error', 'error');
  }
}

// Install from URL
document.getElementById('install-url-btn')?.addEventListener('click', async () => {
  const url = document.getElementById('apk-url').value.trim();
  if (!url) return;

  const log = document.getElementById('install-log');
  log.textContent = `Downloading from ${url}...`;

  const r = await api('/install-url', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
  log.textContent = r.output || (r.ok ? 'Success' : 'Failed');
  toast(r.ok ? '✅ APK installed' : '❌ Install failed', r.ok ? 'success' : 'error');
  if (r.ok) loadApps();
});

// Quick install chips
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', async () => {
    const url = chip.dataset.url;
    document.getElementById('apk-url').value = url;
    document.getElementById('install-url-btn').click();
  });
});

// ── Files tab ──
const fileDropZone = document.getElementById('file-drop-zone');
const fileUploadInput = document.getElementById('file-input-upload');

fileDropZone.addEventListener('click', () => fileUploadInput.click());
fileDropZone.addEventListener('dragover', e => {
  e.preventDefault();
  fileDropZone.classList.add('dragover');
});
fileDropZone.addEventListener('dragleave', () => fileDropZone.classList.remove('dragover'));
fileDropZone.addEventListener('drop', e => {
  e.preventDefault();
  fileDropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
});
fileUploadInput.addEventListener('change', () => {
  if (fileUploadInput.files.length) uploadFile(fileUploadInput.files[0]);
});

async function uploadFile(file) {
  const log = document.getElementById('upload-log');
  log.textContent = `Uploading ${file.name}...`;

  // We use adb push via a simple upload endpoint
  const form = new FormData();
  form.append('file', file);

  try {
    const r = await fetch('/api/adb/upload', { method: 'POST', body: form });
    const data = await r.json();
    log.textContent = data.output || (data.ok ? 'File uploaded to /sdcard/' + file.name : 'Failed');
    toast(data.ok ? '✅ File uploaded' : '❌ Upload failed', data.ok ? 'success' : 'error');
  } catch (e) {
    log.textContent = `Error: ${e.message}`;
    toast('❌ Upload error', 'error');
  }
}

// Add upload endpoint to server (we'll add it)
// ── Info tab ──
async function loadInfo() {
  const info = await api('/info');
  const grid = document.getElementById('info-content');

  if (!info.boot_completed && !info['build.version.release']) {
    grid.innerHTML = '<p style="color:var(--text-dim)">Device not connected</p>';
    return;
  }

  const fields = [
    ['Android', info['build.version.release']],
    ['SDK', info['build.version.sdk']],
    ['Model', info['product.model']],
    ['Manufacturer', info['product.manufacturer']],
    ['Timezone', info['persist.sys.timezone']],
    ['Boot Completed', info.boot_completed ? '✅ Yes' : '❌ No'],
  ];

  if (info.memory) {
    const lines = info.memory.split('\n').map(l => l.trim()).filter(Boolean);
    fields.push(['Memory', lines.join(' | ')]);
  }

  grid.innerHTML = fields.map(([k, v]) =>
    `<div class="label">${k}</div><div>${v || '-'}</div>`
  ).join('');
}

document.getElementById('refresh-info')?.addEventListener('click', loadInfo);

// Tab shown handler - reload data when switching to certain tabs
const origClick = document.querySelector('.tb-btn[data-tab="apps"]').click;
document.querySelectorAll('.tb-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab === 'apps') loadApps();
    if (tab === 'info') loadInfo();
  });
});
