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
|---|---|
| **Android 12** | Full Android di container Docker |
| **Web Panel** | Akses via browser — sentuh, keyboard, clipboard |
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
┌──────────────────────────────────────────┐
│                                          │
│    ┌──────────────────────────────┐      │
│    │                              │      │
│    │     Android 12               │      │
│    │     Running in Docker        │      │
│    │                              │      │
│    └──────────────────────────────┘      │
│                                          │
│    Browser ← WebSocket ← ws-scrcpy       │
│                      ← ADB ← redroid     │
│                                          │
└──────────────────────────────────────────┘
```

<br>

## 🎮 Perintah

| Command | Fungsi |
|---------|--------|
| `sudo bash run.sh` | Install + start + tunnel prompt |
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

| Service | RAM |
|---------|-----|
| redroid | ~1.5 GB |
| ws-scrcpy | ~28 MB |
| Docker overhead | ~100 MB |
| **Total** | **~1.7 GB** |

<br>

## 📦 Struktur Proyek

```
android-cloud/
├── run.sh                    # Main — cukup jalanin ini
├── docker-compose.yml        # Orchestrator container
├── scripts/
│   ├── install.sh            # Install docker, kernel modules, dll
│   └── tunnel.sh             # Cloudflare & localhost.run manager
├── udev/
│   └── 99-android-cloud.rules  # Biar binder device permission otomatis
├── assets/
│   └── icon.png              # Logo
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
┌─────────────────────┐
│  ws-scrcpy           │  ← Web panel (streaming H.264 + input)
│  (Node.js)           │
└─────────┬───────────┘
          │ ADB TCP :5555
          ▼
┌─────────────────────┐
│  redroid             │  ← Android 12 container
│  (Android 12)        │
└─────────────────────┘
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
