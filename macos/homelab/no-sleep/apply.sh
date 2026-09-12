#!/bin/bash
set -euo pipefail

# Keep this Mac running as a headless/home-lab server, including with the lid
# closed. Run manually when you want to apply these settings:
#   ./macos/homelab/no-sleep/apply.sh
#
# Note: this intentionally disables sleep on both AC and battery. Keep the Mac
# well ventilated; do not run it inside a bag or enclosed space.

if [[ "${EUID}" -eq 0 ]]; then
    PMSET=(/usr/bin/pmset)
else
    sudo -v
    PMSET=(sudo /usr/bin/pmset)
fi

# disablesleep is the lid-closed/server setting. The remaining values disable
# idle sleep, disk sleep, display sleep, hibernation, standby, and autopoweroff
# across all power sources (-a = AC, battery, and UPS).
"${PMSET[@]}" -a \
    disablesleep 1 \
    sleep 0 \
    disksleep 0 \
    displaysleep 0 \
    hibernatemode 0 \
    standby 0 \
    autopoweroff 0 \
    powernap 0

printf '\nApplied homelab power settings:\n'
"${PMSET[@]}" -g custom
printf '\nSystem-wide sleep status:\n'
"${PMSET[@]}" -g | grep -E '^SleepDisabled|^Currently in use:' -A 20 || true
