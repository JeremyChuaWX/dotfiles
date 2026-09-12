#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_NAME="com.malletface.homelab-power.plist"
PLIST_SOURCE="$SCRIPT_DIR/$PLIST_NAME"
PLIST_DEST="/Library/LaunchDaemons/$PLIST_NAME"
SERVICE="system/com.malletface.homelab-power"

if [[ "${EUID}" -eq 0 ]]; then
    SUDO=()
else
    sudo -v
    SUDO=(sudo)
fi

# Install the root-owned LaunchDaemon, replacing an older loaded copy if one
# exists. The daemon runs apply.sh at every boot.
"${SUDO[@]}" launchctl bootout "$SERVICE" 2>/dev/null || true
"${SUDO[@]}" cp "$PLIST_SOURCE" "$PLIST_DEST"
"${SUDO[@]}" chown root:wheel "$PLIST_DEST"
"${SUDO[@]}" chmod 644 "$PLIST_DEST"
"${SUDO[@]}" launchctl bootstrap system "$PLIST_DEST"

printf 'Installed and loaded %s.\n' "$SERVICE"
printf 'It will reapply no-sleep settings at every boot.\n'
