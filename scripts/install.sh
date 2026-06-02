#!/usr/bin/env bash
set -euo pipefail

install_docker() {
    if command -v docker &>/dev/null; then
        echo "[OK] Docker already installed"
        return
    fi
    echo "[...] Installing Docker..."
    apt-get update -qq
    apt-get install -y -qq docker.io docker-compose
    systemctl enable docker 2>/dev/null || true
    systemctl start docker 2>/dev/null || true
    echo "[OK] Docker installed"
}

install_adb() {
    if command -v adb &>/dev/null; then
        echo "[OK] ADB already installed"
        return
    fi
    echo "[...] Installing ADB..."
    apt-get install -y -qq adb 2>/dev/null || true
}

setup_kernel_modules() {
    echo "[...] Setting up binder kernel module..."

    if lsmod 2>/dev/null | grep -q binder_linux; then
        rmmod binder_linux 2>/dev/null || true
    fi

    modprobe binder_linux devices=binder1,binder2,binder3 2>/dev/null || {
        echo "[FAIL] binder_linux module not found"
        echo "  Run: apt-get install linux-modules-extra-\$(uname -r)"
        echo "  Or build kernel with CONFIG_ANDROID_BINDER_IPC=m"
        exit 1
    }

    sleep 1

    for dev in binder binder1 binder2 binder3; do
        local dev_path="/dev/$dev"
        local sys_dev="/sys/class/misc/$dev/dev"

        if [ ! -c "$dev_path" ] && [ -f "$sys_dev" ]; then
            local minor
            minor=$(cut -d: -f2 < "$sys_dev")
            mknod "$dev_path" c 10 "$minor" 2>/dev/null || true
        fi

        chmod 666 "$dev_path" 2>/dev/null || true
    done

    echo "[OK] Binder devices ready"
    ls -la /dev/binder /dev/binder1 /dev/binder2 /dev/binder3 2>/dev/null
}

install_udev_rules() {
    local rules_file="/etc/udev/rules.d/99-android-cloud.rules"
    if [ -f "$rules_file" ]; then
        echo "[OK] udev rules already installed"
        return
    fi

    local script_dir
    script_dir="$(cd "$(dirname "$0")/.." && pwd)"

    cp "$script_dir/udev/99-android-cloud.rules" "$rules_file"
    udevadm control --reload-rules 2>/dev/null || true
    udevadm trigger 2>/dev/null || true
    echo "[OK] udev rules installed"
}

main() {
    echo "========================================="
    echo "  Android-Cloud - Dependency Installer"
    echo "========================================="
    echo ""

    install_docker
    install_adb
    setup_kernel_modules
    install_udev_rules

    echo ""
    echo "========================================="
    echo "  All dependencies ready!"
    echo "========================================="
}

main "$@"
