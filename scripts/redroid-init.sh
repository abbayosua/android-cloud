#!/usr/bin/env bash
set -euo pipefail

ADB_HOST="${1:-redroid}"
ADB_PORT="${2:-5555}"
APK_DIR="${3:-/apks}"

echo "[init] Waiting for redroid boot..."
adb connect "$ADB_HOST:$ADB_PORT" 2>/dev/null || true
adb -s "$ADB_HOST:$ADB_PORT" wait-for-device

# Wait for boot completed
for i in $(seq 1 30); do
  boot=$(adb -s "$ADB_HOST:$ADB_PORT" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r\n')
  if [ "$boot" = "1" ]; then
    echo "[init] Boot completed"
    break
  fi
  echo "[init] Waiting for boot... ($i/30)"
  sleep 5
done

# ── Disable useless services ──
echo "[init] Disabling SystemUI..."
adb -s "$ADB_HOST:$ADB_PORT" shell pm disable-user com.android.systemui 2>&1 || true

echo "[init] Disabling Launcher..."
adb -s "$ADB_HOST:$ADB_PORT" shell pm disable-user com.android.launcher3 2>&1 || true

# Also try common launcher variants
adb -s "$ADB_HOST:$ADB_PORT" shell pm disable-user com.android.launcher 2>&1 || true

# ── Install APKs ──
if [ -d "$APK_DIR" ]; then
  for apk in "$APK_DIR"/*.apk; do
    if [ -f "$apk" ]; then
      echo "[init] Installing $(basename "$apk")..."
      adb -s "$ADB_HOST:$ADB_PORT" install -r "$apk" 2>&1 || echo "[init] Failed to install $apk"
    fi
  done
fi

echo "[init] Redroid initialization complete!"
adb -s "$ADB_HOST:$ADB_PORT" disconnect 2>/dev/null || true
