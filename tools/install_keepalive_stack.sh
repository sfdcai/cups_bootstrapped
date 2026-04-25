#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p /usr/local/bin /usr/local/lib/cups-keepalive /var/lib/cups-keepalive/docs

install -m 755 "$REPO_ROOT/tools/cups_keepalive_worker.py" /usr/local/bin/cups-keepalive-worker
install -m 755 "$REPO_ROOT/tools/cups_printer_snapshot.py" /usr/local/bin/cups-printer-snapshot
install -m 755 "$REPO_ROOT/tools/cups_keepalive_api.py" /usr/local/bin/cups-keepalive-api

install -m 644 "$REPO_ROOT/systemd/cups-keepalive.service" /etc/systemd/system/cups-keepalive.service
install -m 644 "$REPO_ROOT/systemd/cups-keepalive.timer" /etc/systemd/system/cups-keepalive.timer
install -m 644 "$REPO_ROOT/systemd/cups-printer-snapshot.service" /etc/systemd/system/cups-printer-snapshot.service
install -m 644 "$REPO_ROOT/systemd/cups-printer-snapshot.timer" /etc/systemd/system/cups-printer-snapshot.timer
install -m 644 "$REPO_ROOT/systemd/cups-keepalive-api.service" /etc/systemd/system/cups-keepalive-api.service

chown -R lp:lp /var/lib/cups-keepalive
chmod -R u+rwX,g+rwX /var/lib/cups-keepalive

systemctl daemon-reload
systemctl restart cups
systemctl enable --now cups-keepalive.timer cups-printer-snapshot.timer cups-keepalive-api.service
systemctl start cups-printer-snapshot.service
