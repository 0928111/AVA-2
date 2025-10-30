#!/usr/bin/env bash
set -euo pipefail

# start-pocketbase.sh — simple launcher for Linux
# Place the pocketbase binary in the same directory and name it 'pocketbase'

PB_BIN="$(dirname "$0")/pocketbase"
PB_DIR="$(dirname "$0")/pb_data"

if [ ! -f "$PB_BIN" ]; then
  echo "pocketbase binary not found in backend/. Please download the Linux binary and place it as 'backend/pocketbase'" >&2
  exit 1
fi

mkdir -p "$PB_DIR"
chown "$(whoami)" "$PB_DIR" || true
chmod 700 "$PB_DIR" || true

exec "$PB_BIN" serve --dir "$PB_DIR"
