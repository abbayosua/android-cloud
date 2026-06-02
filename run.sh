#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TUNNEL_METHOD="${2:-ask}"

usage() {
    cat <<EOF
Usage: ./run.sh [command]

Commands:
  start        Install & start everything (default)
  stop         Stop all containers
  restart      Stop then start
  status       Show container status
  logs         Tail all logs
  shell        Open ADB shell
  tunnel       Create internet tunnel (cloudflare|localhost)
  update       Pull latest images
  uninstall    Remove containers + data

Tunnel methods:
  cloudflare   TryCloudflare (faster, needs binary download)
  localhost    localhost.run (SSH-based, no account)
  ask          Prompt to choose (default)

Examples:
  ./run.sh                          # start with tunnel prompt
  ./run.sh start localhost          # start + localhost.run
  ./run.sh tunnel cloudflare        # just start tunnel
  ./run.sh stop                     # stop everything
EOF
}

cmd_install() {
    echo "========================================="
    echo "  Android-Cloud - Installer"
    echo "========================================="
    echo ""

    bash "$SCRIPT_DIR/scripts/install.sh"
}

cmd_start() {
    cmd_install

    mkdir -p "$HOME/android-cloud-data"

    echo "[...] Starting containers..."

    cd "$SCRIPT_DIR"
    docker compose up -d

    echo ""
    echo "[...] Waiting for redroid boot..."
    local port="${ANDROID_CLOUD_PORT:-5555}"
    adb connect "localhost:$port" 2>/dev/null || true

    local booted=false
    for i in $(seq 1 60); do
        boot=$(adb -s "localhost:$port" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r\n')
        if [ "$boot" = "1" ]; then
            echo "[OK] Android boot completed"
            booted=true
            break
        fi
        sleep 5
    done

    if [ "$booted" = true ]; then
        echo "[...] Optimizing Android (disabling SystemUI + Launcher)..."
        adb -s "localhost:$port" shell pm disable-user com.android.systemui 2>/dev/null || true
        adb -s "localhost:$port" shell pm disable-user com.android.launcher3 2>/dev/null || true
        adb -s "localhost:$port" shell pm disable-user com.android.launcher 2>/dev/null || true
        echo "[OK] SystemUI + Launcher disabled (saves ~850 MB RAM)"

        echo "[...] Installing Via Browser..."
        local via_apk="/tmp/via-release.apk"
        if [ ! -f "$via_apk" ]; then
            curl -sL -o "$via_apk" "https://res.viayoo.com/v1/via-release.apk" 2>/dev/null || true
        fi
        if [ -f "$via_apk" ]; then
            adb -s "localhost:$port" install -r "$via_apk" 2>/dev/null && echo "[OK] Via Browser installed" || echo "[SKIP] Via install failed"
        fi
    else
        echo "[WARN] Boot not completed within timeout, skipping optimization"
    fi

    echo ""
    echo "  ── Services ──"
    echo "  Web Panel:    http://localhost:8233"
    echo "  ADB:          adb connect localhost:${ANDROID_CLOUD_PORT:-5555}"
    echo ""

    bash "$SCRIPT_DIR/scripts/tunnel.sh" "$TUNNEL_METHOD"

    echo ""
    echo "  ╔═══════════════════════════════════════╗"
    echo "  ║  Android-Cloud is RUNNING!            ║"
    echo "  ╚═══════════════════════════════════════╝"
}

cmd_stop() {
    echo "[...] Stopping containers..."
    cd "$SCRIPT_DIR"
    docker compose down
    pkill cloudflared 2>/dev/null || true
    pkill -f "localhost.run" 2>/dev/null || true
    echo "[OK] Stopped"
}

cmd_restart() {
    cmd_stop
    sleep 2
    TUNNEL_METHOD="$TUNNEL_METHOD" cmd_start
}

cmd_status() {
    echo "=== Containers ==="
    cd "$SCRIPT_DIR"
    docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No containers"

    echo ""
    echo "=== ADB ==="
    adb devices -l 2>/dev/null || echo "adb not available"

    echo ""
    echo "=== Binder Devices ==="
    ls -la /dev/binder /dev/binder1 /dev/binder2 /dev/binder3 2>/dev/null || echo "No binder devices"

    echo ""
    echo "=== Tunnel ==="
    if pgrep cloudflared &>/dev/null; then
        echo "Cloudflare tunnel active"
        grep -o 'https://[a-z-]*\.trycloudflare\.com' /tmp/android-cloud-tunnel.log 2>/dev/null | tail -1
    elif pgrep -f "localhost.run" &>/dev/null; then
        echo "localhost.run tunnel active"
    else
        echo "No tunnel active"
    fi

    echo ""
    echo "=== Resource Usage ==="
    docker stats --no-stream 2>/dev/null | tail -n +2 | awk '{printf "  %-20s %s  %s\n", $NF, $3, $4}'
}

cmd_logs() {
    cd "$SCRIPT_DIR"
    docker compose logs -f
}

cmd_shell() {
    echo "Opening ADB shell..."
    adb shell 2>/dev/null || adb connect localhost:${ANDROID_CLOUD_PORT:-5555} 2>/dev/null && adb shell
}

cmd_tunnel() {
    bash "$SCRIPT_DIR/scripts/tunnel.sh" "$TUNNEL_METHOD"
}

cmd_update() {
    echo "[...] Pulling latest images..."
    cd "$SCRIPT_DIR"
    docker compose pull
    echo "[OK] Updated. Run ./run.sh restart to apply."
}

cmd_uninstall() {
    echo "[WARN] This will remove all Android-Cloud containers and data!"
    read -rp "Continue? [y/N]: " confirm </dev/tty

    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Aborted"
        exit 0
    fi

    cmd_stop
    docker volume rm android-cloud_android-cloud-data 2>/dev/null || true
    echo "[OK] Uninstalled"
}

main() {
    case "${1:-start}" in
        start|up)     cmd_start ;;
        stop|down)    cmd_stop ;;
        restart)      cmd_restart ;;
        status)       cmd_status ;;
        logs)         cmd_logs ;;
        shell)        cmd_shell ;;
        tunnel)       cmd_tunnel ;;
        update)       cmd_update ;;
        uninstall)    cmd_uninstall ;;
        --help|-h)    usage ;;
        *)            echo "Unknown: $1"; usage; exit 1 ;;
    esac
}

main "$@"
