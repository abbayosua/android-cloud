#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

TUNNEL_CMD="${1:-ask}"

do_cloudflare() {
    echo "[...] Starting Cloudflare Tunnel..."

    if ! command -v cloudflared &>/dev/null; then
        echo "[...] Downloading cloudflared..."
        curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
            -o /usr/local/bin/cloudflared
        chmod +x /usr/local/bin/cloudflared
    fi

    pkill cloudflared 2>/dev/null || true
    sleep 1

    nohup cloudflared tunnel --url http://localhost:8233 \
        > /tmp/android-cloud-tunnel.log 2>&1 &

    echo "[OK] Waiting for tunnel URL..."
    sleep 8

    local url
    url=$(grep -o 'https://[a-z-]*\.trycloudflare\.com' /tmp/android-cloud-tunnel.log 2>/dev/null | head -1)

    if [ -n "$url" ]; then
        echo ""
        echo "========================================="
        echo "  Cloudflare Tunnel Active!"
        echo "  $url"
        echo "========================================="
        echo ""
        echo "  Tunnel PID: $(pgrep cloudflared)"
        echo "  Stop with:  pkill cloudflared"
    else
        echo "[FAIL] Could not get tunnel URL, check /tmp/android-cloud-tunnel.log"
        return 1
    fi
}

do_localhost_run() {
    echo "[...] Starting localhost.run Tunnel..."

    pkill -f "localhost.run" 2>/dev/null || true
    sleep 1

    nohup ssh -o StrictHostKeyChecking=no -R 80:localhost:8233 nokey@localhost.run \
        > /tmp/android-cloud-tunnel.log 2>&1 &

    sleep 6

    local url
    url=$(grep -o 'https://[a-z0-9]*\.localhost\.run' /tmp/android-cloud-tunnel.log 2>/dev/null | head -1)

    if [ -n "$url" ]; then
        echo ""
        echo "========================================="
        echo "  localhost.run Tunnel Active!"
        echo "  $url"
        echo "========================================="
        echo ""
        echo "  Tunnel PID: $(pgrep -f 'localhost.run')"
        echo "  Stop with:  pkill -f localhost.run"
    else
        echo "[FAIL] Could not establish localhost.run tunnel"
        echo "  Make sure SSH is installed and you have internet."
        tail -5 /tmp/android-cloud-tunnel.log 2>/dev/null
        return 1
    fi
}

ask_tunnel() {
    echo ""
    echo "Choose tunnel method (or Ctrl+C to skip):"
    echo "  1) Cloudflare Tunnel  (trycloudflare.com, faster)"
    echo "  2) localhost.run      (SSH-based, no account needed)"
    echo ""

    read -rp "Pick [1/2/skip]: " choice </dev/tty

    case "$choice" in
        1) do_cloudflare ;;
        2) do_localhost_run ;;
        *) echo "[SKIP] No tunnel started" ;;
    esac
}

main() {
    case "$TUNNEL_CMD" in
        cloudflare) do_cloudflare ;;
        localhost)  do_localhost_run ;;
        ask)        ask_tunnel ;;
        *)          echo "Usage: $0 {cloudflare|localhost|ask}" ;;
    esac
}

main "$@"
