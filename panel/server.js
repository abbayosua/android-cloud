const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');
const { WebSocket: WebSocketClient } = require('ws');
const multer = require('multer');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8233;
const ADB_HOST = process.env.ADB_HOST || 'redroid';
const APK_DIR = '/apks';

const upload = multer({ dest: '/tmp/uploads' });

function adb(args) {
  try {
    const out = execSync(`adb -s ${ADB_HOST}:5555 ${args} 2>/dev/null`, {
      timeout: 30000,
      encoding: 'utf-8',
    });
    return { ok: true, data: out.trim() };
  } catch (e) {
    return { ok: false, error: e.message || e.toString() };
  }
}

app.use(express.json());

app.post('/api/adb/connect', (_req, res) => {
  const out = adb(`connect ${ADB_HOST}:5555`);
  if (out.ok) {
    const r = execSync(`adb -s ${ADB_HOST}:5555 wait-for-device 2>/dev/null`, { timeout: 60000 });
  }
  res.json(out);
});

app.post('/api/adb/install', upload.single('apk'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file uploaded' });

  const dest = path.join('/tmp/uploads', req.file.filename + '.apk');
  fs.renameSync(req.file.path, dest);

  const out = execSync(`adb -s ${ADB_HOST}:5555 wait-for-device && adb -s ${ADB_HOST}:5555 install -r "${dest}" 2>&1`, {
    timeout: 120000,
    encoding: 'utf-8',
  });

  fs.unlinkSync(dest);

  const ok = out.includes('Success');
  res.json({ ok, output: out.trim() });
});

app.post('/api/adb/install-url', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'no url' });

  const tmp = `/tmp/apk-${Date.now()}.apk`;
  try {
    const curl = execSync(`curl -sL -o "${tmp}" "${url}" 2>/dev/null`, { timeout: 60000 });
    const out = execSync(`adb -s ${ADB_HOST}:5555 install -r "${tmp}" 2>&1`, { timeout: 120000, encoding: 'utf-8' });
    fs.unlinkSync(tmp);
    res.json({ ok: out.includes('Success'), output: out.trim() });
  } catch (e) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    res.json({ ok: false, error: e.message });
  }
});

app.get('/api/adb/apps', (_req, res) => {
  const out = adb('shell pm list packages -3');
  if (!out.ok) return res.status(500).json(out);

  const pkgs = out.data.split('\n').filter(Boolean).map(l => l.replace('package:', ''));

  const apps = pkgs.map(pkg => {
    const name = adb(`shell dumpsys package ${pkg} 2>/dev/null | grep -m1 'application-label-en_US\\|application-label' | cut -d= -f2`);
    const launch = adb(`shell pm resolve-activity --brief ${pkg} 2>/dev/null | tail -1`);
    return {
      package: pkg,
      name: name.ok ? name.data.replace(/'/g, '') : pkg,
      activity: launch.ok && launch.data !== 'No activity found' ? launch.data : null,
    };
  });

  res.json(apps);
});

app.post('/api/adb/launch', (req, res) => {
  const { package: pkg, activity } = req.body;
  if (!pkg) return res.status(400).json({ error: 'package required' });

  if (activity) {
    const out = adb(`shell am start -n ${activity}`);
    res.json(out);
  } else {
    const out = adb(`shell monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`);
    res.json(out);
  }
});

app.post('/api/adb/disable', (req, res) => {
  const { packages } = req.body;
  if (!packages || !packages.length) return res.status(400).json({ error: 'packages required' });

  const results = packages.map(pkg => {
    const out = adb(`shell pm disable-user "${pkg}"`);
    return { package: pkg, ok: out.ok, output: out.data || out.error };
  });

  res.json(results);
});

app.get('/api/adb/info', (_req, res) => {
  const boot = adb('shell getprop sys.boot_completed');
  const props = [
    'ro.build.version.release',
    'ro.build.version.sdk',
    'ro.product.model',
    'ro.product.manufacturer',
    'persist.sys.timezone',
    'ro.serialno',
  ];
  const info = {};
  props.forEach(p => {
    const out = adb(`shell getprop ${p}`);
    info[p.replace(/^ro\./, '')] = out.ok ? out.data : '-';
  });
  const mem = adb("shell cat /proc/meminfo | grep -E '^(MemTotal|MemFree|MemAvailable)'");
  info.boot_completed = boot.ok && boot.data === '1';
  info.memory = mem.ok ? mem.data : '-';
  res.json(info);
});

app.post('/api/adb/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });

  const dest = `/sdcard/${req.file.originalname}`;
  const tmp = req.file.path;

  try {
    const out = execSync(`adb -s ${ADB_HOST}:5555 push "${tmp}" "${dest}" 2>&1`, {
      timeout: 60000, encoding: 'utf-8',
    });
    fs.unlinkSync(tmp);
    res.json({ ok: true, output: out.trim() });
  } catch (e) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    res.json({ ok: false, error: e.message });
  }
});

app.post('/api/adb/reboot', (_req, res) => {
  res.json({ ok: true, message: 'restart not supported from panel' });
});

app.use('/screen', createProxyMiddleware({
  target: 'http://ws-scrcpy:8000',
  pathRewrite: { '^/screen': '/' },
  ws: true,
  changeOrigin: true,
}));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`[panel] Android-Cloud Panel running on port ${PORT}`);
  console.log(`[panel] Proxying ws-scrcpy at /screen`);
});

// Proxy ALL WebSocket upgrades to ws-scrcpy using ws library
// (http-proxy corrupts WebSocket frames with RSV1 flag)
const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://localhost');
  const target = url.pathname + url.search;

  wss.handleUpgrade(req, socket, head, (clientWs) => {
    const serverWs = new WebSocketClient(`ws://ws-scrcpy:8000${target}`);

    serverWs.on('open', () => {
      clientWs.on('message', data => serverWs.send(data));
      serverWs.on('message', data => clientWs.send(data));
      clientWs.on('close', () => serverWs.close());
      serverWs.on('close', () => clientWs.close());
      clientWs.on('error', () => serverWs.close());
      serverWs.on('error', () => clientWs.close());
    });

    serverWs.on('error', () => clientWs.close());
  });
});
