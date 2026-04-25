#!/usr/bin/env python3
import cgi
import io
import json
import os
import re
import ssl
import subprocess
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

BASE_DIR = Path('/var/lib/cups-keepalive')
DOCS_DIR = BASE_DIR / 'docs'
CONFIG_PATH = BASE_DIR / 'config.json'
STATE_PATH = BASE_DIR / 'state.json'
WORKER = '/usr/local/bin/cups-keepalive-worker'


def load_json(path, default):
    if not path.exists():
        return default
    with path.open('r', encoding='utf-8') as f:
        return json.load(f)


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.tmp')
    with tmp.open('w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, sort_keys=True)
    os.replace(tmp, path)


def list_printers():
    out = subprocess.run(['lpstat', '-v'], capture_output=True, text=True)
    printers = []
    if out.returncode == 0:
        for line in out.stdout.splitlines():
            m = re.match(r'^device for (.+?):\s+(.+)$', line.strip())
            if m:
                printers.append(m.group(1))
    return printers


def status_payload():
    return {
        'ok': True,
        'config': load_json(CONFIG_PATH, {}),
        'state': load_json(STATE_PATH, {}),
        'printers': list_printers(),
    }


def sanitize_filename(name):
    safe = re.sub(r'[^A-Za-z0-9._-]+', '_', name)
    return safe or 'upload.bin'


def run_worker(force=False):
    cmd = [WORKER, 'run']
    if force:
        cmd.append('--force')
    subprocess.run(cmd, capture_output=True, text=True)


class Handler(BaseHTTPRequestHandler):
    server_version = 'KeepaliveAPI/1.0'

    def _cors(self):
        origin = self.headers.get('Origin', '')
        if origin.startswith('https://192.168.1.') or origin.startswith('https://127.0.0.1') or origin.startswith('https://localhost'):
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')

    def _send_json(self, payload, code=200):
        raw = json.dumps(payload).encode('utf-8')
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Max-Age', '600')
        self.end_headers()

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == '/api/status':
            self._send_json(status_payload())
            return
        self._send_json({'ok': False, 'error': 'not_found'}, 404)

    def _parse_form(self):
        ctype = self.headers.get('Content-Type', '')
        length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(length)

        if ctype.startswith('application/x-www-form-urlencoded'):
            parsed = parse_qs(body.decode('utf-8'), keep_blank_values=True)
            return {k: v[0] for k, v in parsed.items()}, None

        environ = {
            'REQUEST_METHOD': 'POST',
            'CONTENT_TYPE': ctype,
            'CONTENT_LENGTH': str(length),
        }
        fp = io.BytesIO(body)
        form = cgi.FieldStorage(fp=fp, environ=environ, keep_blank_values=True)
        return None, form

    def do_POST(self):
        u = urlparse(self.path)
        if u.path not in ('/api/upload_schedule', '/api/run_now', '/api/disable'):
            self._send_json({'ok': False, 'error': 'not_found'}, 404)
            return

        try:
            data, form = self._parse_form()

            if u.path == '/api/run_now':
                run_worker(force=True)
                self._send_json(status_payload())
                return

            if u.path == '/api/disable':
                cfg = load_json(CONFIG_PATH, {})
                cfg['enabled'] = False
                cfg['updated_at'] = datetime.now(timezone.utc).isoformat()
                save_json(CONFIG_PATH, cfg)
                self._send_json(status_payload())
                return

            printer = ''
            frequency = 'weekly'
            print_now = False
            file_item = None

            if data is not None:
                printer = data.get('printer', '').strip()
                frequency = data.get('frequency', 'weekly').strip().lower()
                print_now = data.get('print_now', '') == '1'
            else:
                printer = form.getfirst('printer', '').strip()
                frequency = form.getfirst('frequency', 'weekly').strip().lower()
                print_now = form.getfirst('print_now', '') == '1'
                file_item = form['document'] if 'document' in form else None

            if frequency not in ('weekly', 'monthly'):
                self._send_json({'ok': False, 'error': 'frequency must be weekly or monthly'}, 400)
                return
            if not printer:
                self._send_json({'ok': False, 'error': 'printer is required'}, 400)
                return
            if file_item is None or not getattr(file_item, 'file', None):
                self._send_json({'ok': False, 'error': 'document is required'}, 400)
                return

            DOCS_DIR.mkdir(parents=True, exist_ok=True)
            ts = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
            filename = sanitize_filename(getattr(file_item, 'filename', 'document.bin'))
            save_path = DOCS_DIR / f'{ts}_{filename}'

            with save_path.open('wb') as out:
                while True:
                    chunk = file_item.file.read(65536)
                    if not chunk:
                        break
                    out.write(chunk)

            cfg = {
                'enabled': True,
                'printer': printer,
                'frequency': frequency,
                'document_path': str(save_path),
                'updated_at': datetime.now(timezone.utc).isoformat(),
            }
            save_json(CONFIG_PATH, cfg)

            if print_now:
                run_worker(force=True)

            self._send_json(status_payload())
        except Exception as exc:
            self._send_json({'ok': False, 'error': str(exc)}, 500)


def main():
    host = os.environ.get('KEEPALIVE_API_HOST', '0.0.0.0')
    port = int(os.environ.get('KEEPALIVE_API_PORT', '6310'))
    cert = os.environ.get('KEEPALIVE_API_CERT', '/etc/cups/ssl/pve.crt')
    key = os.environ.get('KEEPALIVE_API_KEY', '/etc/cups/ssl/pve.key')

    httpd = HTTPServer((host, port), Handler)
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile=cert, keyfile=key)
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    httpd.serve_forever()


if __name__ == '__main__':
    main()
