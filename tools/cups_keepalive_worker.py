#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import os
import re
import subprocess
from pathlib import Path

BASE_DIR = Path('/var/lib/cups-keepalive')
CONFIG_PATH = BASE_DIR / 'config.json'
STATE_PATH = BASE_DIR / 'state.json'


def load_json(path: Path, default):
    if not path.exists():
      return default
    with path.open('r', encoding='utf-8') as f:
      return json.load(f)


def save_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.tmp')
    with tmp.open('w', encoding='utf-8') as f:
      json.dump(data, f, indent=2, sort_keys=True)
    os.replace(tmp, path)


def period_token(now: dt.datetime, frequency: str) -> str:
    if frequency == 'weekly':
      y, w, _ = now.isocalendar()
      return f'{y}-W{w:02d}'
    return f'{now.year}-{now.month:02d}'


def run_print(printer: str, document_path: str):
    cmd = ['lp', '-d', printer, document_path]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    return proc.returncode, (proc.stdout or '') + (proc.stderr or '')


def extract_job_id(output: str):
    match = re.search(r'request id is\s+([^\s]+)', output)
    return match.group(1) if match else None


def do_run(force: bool):
    config = load_json(CONFIG_PATH, {})
    state = load_json(STATE_PATH, {})
    now = dt.datetime.now().astimezone()

    if not config.get('enabled'):
      state['last_result'] = 'disabled'
      state['updated_at'] = now.isoformat()
      save_json(STATE_PATH, state)
      return 0

    printer = config.get('printer')
    document_path = config.get('document_path')
    frequency = config.get('frequency', 'weekly')

    if not printer or not document_path:
      state['last_result'] = 'invalid_config'
      state['updated_at'] = now.isoformat()
      save_json(STATE_PATH, state)
      return 1

    if not Path(document_path).exists():
      state['last_result'] = 'missing_document'
      state['updated_at'] = now.isoformat()
      save_json(STATE_PATH, state)
      return 2

    current_period = period_token(now, frequency)
    if not force and state.get('last_period') == current_period:
      state['last_result'] = 'already_printed_this_period'
      state['updated_at'] = now.isoformat()
      save_json(STATE_PATH, state)
      return 0

    code, output = run_print(printer, document_path)
    state['updated_at'] = now.isoformat()
    state['last_period'] = current_period
    state['last_output'] = output.strip()

    if code == 0:
      state['last_result'] = 'printed'
      state['last_printed_at'] = now.isoformat()
      state['last_job_id'] = extract_job_id(output)
      save_json(STATE_PATH, state)
      return 0

    state['last_result'] = f'print_failed_{code}'
    save_json(STATE_PATH, state)
    return code


def do_status():
    config = load_json(CONFIG_PATH, {})
    state = load_json(STATE_PATH, {})
    print(json.dumps({'config': config, 'state': state}, indent=2, sort_keys=True))


def main():
    parser = argparse.ArgumentParser(description='CUPS keepalive worker')
    sub = parser.add_subparsers(dest='cmd', required=True)

    run_p = sub.add_parser('run', help='run scheduler check')
    run_p.add_argument('--force', action='store_true', help='always print now')

    sub.add_parser('status', help='show current config and state')

    args = parser.parse_args()
    if args.cmd == 'run':
      raise SystemExit(do_run(force=args.force))
    if args.cmd == 'status':
      do_status()
      return


if __name__ == '__main__':
    main()
