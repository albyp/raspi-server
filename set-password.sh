#!/usr/bin/env bash
# Set (or change) the dashboard login password. Run on the host from the repo root:
#   ./set-password.sh
# Writes DASHBOARD_PASSWORD_HASH (and SESSION_SECRET if missing) into .env, then restarts.
# Changing SESSION_SECRET logs every browser out; delete that line and re-run to force it.
set -euo pipefail
cd "$(dirname "$0")"

read -rsp 'New dashboard password (12+ chars): ' pw1; echo
read -rsp 'Repeat password: ' pw2; echo
[ "$pw1" = "$pw2" ] || { echo 'Passwords do not match.' >&2; exit 1; }

hash=$(printf '%s' "$pw1" | docker run --rm -i --entrypoint node raspi-dashboard:latest scripts/hash-password.js)
unset pw1 pw2

touch .env
chmod 600 .env
sed -i '/^DASHBOARD_PASSWORD_HASH=/d' .env
echo "DASHBOARD_PASSWORD_HASH=$hash" >> .env
grep -q '^SESSION_SECRET=' .env || echo "SESSION_SECRET=$(openssl rand -hex 32)" >> .env

docker compose up -d
url=$(sed -n 's/^PUBLIC_URL=//p' .env | tail -1)
echo "Password set. Log in at ${url:-the dashboard's tailscale serve address}"
