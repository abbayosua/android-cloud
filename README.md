<p align="center">
  <img src="assets/icon.svg" width="120" alt="Android-Cloud">
</p>

<h1 align="center">Android-Cloud</h1>

<p align="center">
  <strong>Android dalam Docker + Web Panel di Browser.</strong><br>
  Jalanin Android di VPS/server, akses dari mana aja via browser.
  <br><br>
  <img src="https://img.shields.io/badge/Android-12-3DDC84?style=flat&logo=android">
  <img src="https://img.shields.io/badge/Docker-ready-2496ED?style=flat&logo=docker">
  <img src="https://img.shields.io/badge/WebRTC-via%20ws--scrcpy-blue">
</p>

<br>

## ✨ Fitur

| Fitur | Detail |
|---|---|---|
| **Android 12** | Full Android di container Docker |
| **Web Panel** | Akses via browser — sentuh, keyboard, clipboard, APK install, file manager |
| **Auto Hemat RAM** | SystemUI + Launcher auto disable (hemat ~850 MB) |
| **Via Browser** | Pre-installed, bisa buka link dari panel |
| **APK Sideload** | Drag & drop APK lewat browser langsung install |
| **ADB** | `adb connect` untuk power user |
| **Internet Tunnel** | Cloudflare atau localhost.run — URL public langsung |
| **Satu Command** | `git clone && bash run.sh` — selesai |

<br>

## 🚀 Quick Start

```bash
git clone https://github.com/abbayosua/android-cloud.git
cd android-cloud
sudo bash run.sh
```

Tinggal pilih tunnel:

```
Choose tunnel method:
  1) Cloudflare Tunnel   — Cepat, download cloudflared otomatis
  2) localhost.run       — SSH tunnel, tanpa install apa-apa
  3) Skip                — Akses lokal dulu
```

Dapet URL kayak `https://xxx.trycloudflare.com` — buka di browser, langsung lihat Android.

<br>

## 📸 Screenshot

```
┌──────────────────────────────────────────────────┐
│  🖥️ Screen  📦 Apps  📥 Install  📁 Files  ℹ️  │ ← Panel UI
├──────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐    │
│  │                                          │    │
│  │     Android 12 (no SystemUI/Launcher)    │    │
│  │     ~950 MB RAM instead of 1.8 GB        │    │
│  │                                          │    │
│  └──────────────────────────────────────────┘    │
│          ↕ ADB TCP                              │
│  ┌──────────────────────────────────────────┐    │
│  │  ws-scrcpy (screen stream via WebSocket)  │    │
│  └──────────────────────────────────────────┘    │
│          ↕ HTTP proxy                            │
│  ┌──────────────────────────────────────────┐    │
│  │  Panel Server (Express + REST API)       │    │
│  │  /api/adb/install → adb install .apk     │    │
│  │  /api/adb/apps    → list packages        │    │
│  │  /api/adb/launch  → start app            │    │
│  │  /api/adb/info    → device info          │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

<br>

## 🎮 Perintah

| Command | Fungsi |
|---------|--------|
| `sudo bash run.sh` | Install + start + auto init (disable UI + install Via) + tunnel |
| `sudo bash run.sh start cloudflare` | Start pake Cloudflare tunnel |
| `sudo bash run.sh start localhost` | Start pake localhost.run |
| `sudo bash run.sh stop` | Stop semua container |
| `sudo bash run.sh restart` | Restart |
| `sudo bash run.sh status` | Cek status + resource |
| `sudo bash run.sh logs` | Lihat log realtime |
| `sudo bash run.sh shell` | ADB shell ke Android |
| `sudo bash run.sh tunnel cloudflare` | Bikin tunnel aja |
| `sudo bash run.sh update` | Update image terbaru |
| `sudo bash run.sh uninstall` | Hapus semua + data |

<br>

## 🌐 Akses

| Akses | URL/Cara |
|-------|----------|
| **Web Panel (lokal)** | `http://localhost:8233` |
| **Web Panel (public)** | URL dari tunnel |
| **ADB (lokal)** | `adb connect localhost:5555` |
| **ADB (public)** | Lewat SSH tunnel: `ssh -L 5555:localhost:5555 user@server` |

<br>

## 🧩 Tunnel Methods

### ☁️ Cloudflare (trycloudflare.com)

| Kelebihan | Kekurangan |
|-----------|------------|
| Cepat, latency rendah | Download binary ~40MB |
| Stabil | Beberapa negara diblokir |
| Auto HTTPS | |

```
https://acak-acakan.trycloudflare.com
```

### 🔗 localhost.run

| Kelebihan | Kekurangan |
|-----------|------------|
| Pakai SSH aja, tanpa install | Agak lebih lambat |
| Work di negara mana aja | Koneksi putus kalo SSH terputus |
| Tiap restart dapet URL baru | |

```
https://acak.localhost.run
```

> **Tips:** Biar URL tetap, pake Cloudflare Tunnel named tunnel (butuh domain sendiri).

<br>

## 🖥️ Spesifikasi

| Komponen | Minimal | Rekomendasi |
|----------|---------|-------------|
| **RAM** | 3 GB | 4 GB+ |
| **CPU** | 2 core x86_64 | 4 core+ |
| **Storage** | 10 GB | 20 GB+ |
| **OS** | Ubuntu 20.04+, Debian 11+ | Debian 12 |
| **Kernel** | `CONFIG_ANDROID_BINDER_IPC=m` | Sudah include di Debian/Ubuntu |

### Pemakaian Resource

| Service | RAM (sebelum) | RAM (sesudah optimasi) |
|---------|:------------:|:----------------------:|
| redroid | ~1.8 GB | **~950 MB** |
| ws-scrcpy | ~28 MB | ~28 MB |
| panel | — | ~35 MB |
| Docker overhead | ~140 MB | ~140 MB |
| **Total** | **~2.0 GB** | **~1.15 GB** |

> Hemat ~850 MB dengan disable SystemUI (+460 MB) dan Launcher3 (+390 MB).

<br>

## 📦 Struktur Proyek

```
android-cloud/
├── run.sh                    # Main — cukup jalanin ini
├── docker-compose.yml        # Orchestrator container
├── panel/
│   ├── Dockerfile             # Panel server image
│   ├── package.json
│   ├── server.js              # Express + proxy ws-scrcpy + REST API
│   └── public/
│       ├── index.html         # Panel UI (toolbar + tabs)
│       ├── style.css
│       └── app.js             # Frontend logic
├── scripts/
│   ├── install.sh            # Install docker, kernel modules, dll
│   ├── tunnel.sh             # Cloudflare & localhost.run manager
│   └── redroid-init.sh       # Script untuk disable SystemUI/Launcher
├── udev/
│   └── 99-android-cloud.rules  # Biar binder device permission otomatis
├── assets/
│   └── icon.svg              # Logo
└── README.md
```

<br>

## 🔧 Cara Kerja

```
Browser Anda
     │
     │ HTTPS (WebSocket)
     ▼
┌─────────────────────┐
│  Cloudflare Tunnel   │  atau  localhost.run
└─────────┬───────────┘
          │ HTTP :8233
          ▼
┌──────────────────────────────────┐
│  Panel Server (Express)          │
│  ┌─ / → index.html (UI)        │
│  ├─ /screen/* → proxy ws-scrcpy│
│  ├─ /api/adb/install           │
│  ├─ /api/adb/apps              │
│  ├─ /api/adb/launch            │
│  └─ /api/adb/info              │
└────────┬───────────────────────┘
         │ HTTP :8000         │ ADB TCP :5555
         ▼                    ▼
┌──────────────┐    ┌──────────────────┐
│  ws-scrcpy    │    │  redroid          │
│  (H.264 via  │    │  (Android 12,     │
│   WebSocket)  │    │   no SystemUI,    │
│              │    │   no Launcher)    │
└──────────────┘    └──────────────────┘
```

<br>

## ⚠️ Catatan Penting

- **Harus `sudo`** — butuh akses kernel module (`modprobe`) dan docker
- **ws-scrcpy tidak punya autentikasi** — kalo diexpose ke publik, pasang reverse proxy dengan basic auth
- **Binder module** — kalo kernel lu gak punya `binder_linux`, cek [redroid-modules](https://github.com/remote-android/redroid-modules)
- **Data persistent** — data Android disimpan di volume `android-cloud-data`

<br>

## ❤️ Kredit

- [redroid](https://github.com/remote-android/redroid-doc) — Android in Docker
- [ws-scrcpy](https://github.com/NetrisTV/ws-scrcpy) — Web scrcpy
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps)
- [localhost.run](https://localhost.run)

<br>

---

<p align="center">
  <sub>Built with ❤️ for remote Android</sub>
</p>
