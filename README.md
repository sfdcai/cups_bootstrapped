# CUPS web interface with Bootstrap CSS
_work by Joakim Ewenson (https://www.ewenson.se) in 2020_

Reworking the CUPS template files for using Bootstrap CSS framework to make a better looking and more responsive view of the CUPS web interface.

### Working, mostly
* Home page
* Admin
* Classes list
* Jobs list
* Printers list

### Working, partly
* Add, modify, remove printers
* Add classes

### Needs work
* Just about everything

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
   `sudo cp -a doc-root /usr/share/cups/`
   `sudo cp -a templates /usr/share/cups/`
5. Fix ownership and permissions:
   `sudo chown -R root:root /usr/share/cups/doc-root /usr/share/cups/templates`
   `sudo find /usr/share/cups/doc-root /usr/share/cups/templates -type d -exec chmod 755 {} \;`
   `sudo find /usr/share/cups/doc-root /usr/share/cups/templates -type f -exec chmod 644 {} \;`
6. Restart CUPS:
   `sudo systemctl restart cups`
7. Open the CUPS UI:
   `http://localhost:631`

## Update to a newer skin version

1. Pull latest repo changes:
   `git pull`
2. Re-copy UI assets:
   `sudo cp -a doc-root /usr/share/cups/`
   `sudo cp -a templates /usr/share/cups/`
3. Restart CUPS:
   `sudo systemctl restart cups`

## Theme switching

This skin includes 10 built-in themes and a runtime theme picker.

1. Open `http://localhost:631/theme-studio.html`
2. Pick a theme from cards/dropdown
3. Theme applies instantly and is saved per-browser using local storage
