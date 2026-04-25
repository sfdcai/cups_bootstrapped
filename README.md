# CUPS Web Interface Skin Pack

Custom CUPS web UI skin built on Bootstrap with:
- Modernized shared layout and navigation
- Theme Studio page
- 12 distinct themes/skins
- Runtime theme switcher across pages
- Optional automatic day/night theme scheduling
- Maintenance scheduler page for recurring anti-dry-up prints

## Installation (quick)

Tested on Debian/Raspbian-style systems with CUPS installed from apt.

1. Install CUPS packages:
   `sudo apt update && sudo apt install -y cups cups-client`
2. Enable and start CUPS:
   `sudo systemctl enable --now cups`
3. Backup the original web UI files:
   `sudo cp -a /usr/share/cups/doc-root /usr/share/cups/doc-root.bak.$(date +%Y%m%d_%H%M%S)`
   `sudo cp -a /usr/share/cups/templates /usr/share/cups/templates.bak.$(date +%Y%m%d_%H%M%S)`
4. Copy this repo's UI files into CUPS:
   `sudo cp -a doc-root/. /usr/share/cups/doc-root/`
   `sudo cp -a templates/. /usr/share/cups/templates/`
5. Fix ownership and permissions:
   `sudo chown -R root:root /usr/share/cups/doc-root /usr/share/cups/templates`
   `sudo find /usr/share/cups/doc-root /usr/share/cups/templates -type d -exec chmod 755 {} \;`
   `sudo find /usr/share/cups/doc-root /usr/share/cups/templates -type f -exec chmod 644 {} \;`
6. Restart CUPS:
   `sudo systemctl restart cups`
7. Open the CUPS UI:
   `https://<cups-host-ip>:631`

## Update to a newer skin version

1. Pull latest repo changes:
   `git pull`
2. Re-copy UI assets:
   `sudo cp -a doc-root/. /usr/share/cups/doc-root/`
   `sudo cp -a templates/. /usr/share/cups/templates/`
3. Restart CUPS:
   `sudo systemctl restart cups`

## Theme Studio

This skin includes 12 built-in themes and a runtime theme picker.

1. Open `https://<cups-host-ip>:631/theme-studio.html`
2. Pick a theme from cards/dropdown
3. Theme applies instantly and is saved per-browser using local storage
4. Enable `Auto Day/Night` mode to schedule day and night themes by hour

## Maintenance scheduler (new)

A dedicated page is included for anti-dry-run prints:

1. Open `https://<cups-host-ip>:631/maintenance.html`
2. Select printer queue
3. Choose `weekly` or `monthly`
4. Upload document
5. Save schedule (optional immediate print)

The page also shows printer telemetry from `printer-status.json`:
- queue state
- device URI
- resolved printer IP
- model string
- queued jobs
- page counter and marker levels when exposed by the device

## Keepalive backend install

The scheduler page depends on a local HTTPS helper API and timers:

1. `sudo ./tools/install_keepalive_stack.sh`
2. Verify services:
   `systemctl status cups-keepalive-api.service cups-keepalive.timer cups-printer-snapshot.timer`
3. API endpoint:
   `https://<cups-host-ip>:6310/api/status`

Notes:
- CUPS itself does not expose custom CGI endpoints on this build, so the helper API runs on port `6310`.
- Browser calls from `https://<cups-host-ip>:631` to `https://<cups-host-ip>:6310` are allowed by CORS in the API service.
- Some printers do not expose ink levels/page counters via IPP; in that case values appear as `not exposed`.

## Maintenance verification

Run these checks on the CUPS host:

1. Page is served:
   `curl -k -I https://<cups-host-ip>:631/maintenance.html`
2. API is reachable:
   `curl -k https://<cups-host-ip>:6310/api/status`
3. Snapshot is updated:
   `curl -k https://<cups-host-ip>:631/printer-status.json`
4. Timer/API services are active:
   `systemctl is-active cups-keepalive-api.service cups-keepalive.timer cups-printer-snapshot.timer`

## Included themes

1. Aurora Glass
2. Terminal Ops
3. Paper Ledger
4. Sunset Metro
5. Forest Console
6. Candy Pop
7. Monochrome Ink
8. Oceanic Depth
9. Desert Sand
10. Royal Velvet
11. Neo Brutalist
12. Zen Garden

## Auto day/night scheduling

1. Open Theme Studio
2. Set `Mode` to `Auto Day/Night`
3. Choose `Day Theme` and `Night Theme`
4. Set `Day Starts` and `Night Starts` as 24-hour values (`0-23`)
5. The active theme is recalculated automatically using browser local time

Notes:
- Schedule is browser-local (per device/browser)
- In auto mode, clicking a theme card updates the currently active slot (day or night)
- `Reset Default` restores manual mode + default schedule

## Deployment verification

Run these checks on the CUPS host:

1. Confirm files exist:
   `ls -l /usr/share/cups/doc-root/theme-studio.html /usr/share/cups/doc-root/theme-switcher.js`
2. Confirm service health:
   `systemctl is-active cups`
3. Confirm page served:
   `curl -k -I https://127.0.0.1:631/theme-studio.html`
4. Confirm remote reachability:
   `curl -k -I https://<cups-host-ip>:631/theme-studio.html`

## Troubleshooting

1. `404 Not Found` for `/theme-studio.html`
   Most common cause is incorrect copy path that created nested directories.
   Use:
   `sudo cp -a doc-root/. /usr/share/cups/doc-root/`
   `sudo cp -a templates/. /usr/share/cups/templates/`
2. Theme not changing
   Hard refresh browser (`Ctrl+F5`) and check `/theme-switcher.js` returns `200`.
3. CSS layout looks broken
   Verify `/cups.css` is from this repo and Bootstrap files exist under `/usr/share/cups/doc-root/bootstrap/`.
4. CUPS not restarting
   Run `systemctl status cups` and resolve service errors before re-testing.

## Rollback

If needed, restore backups created during install:

1. `sudo rm -rf /usr/share/cups/doc-root /usr/share/cups/templates`
2. `sudo mv /usr/share/cups/doc-root.bak.<timestamp> /usr/share/cups/doc-root`
3. `sudo mv /usr/share/cups/templates.bak.<timestamp> /usr/share/cups/templates`
4. `sudo systemctl restart cups`
