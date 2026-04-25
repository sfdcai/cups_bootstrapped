#!/usr/bin/env python3
import json
import re
import socket
import subprocess
from datetime import datetime, timezone
from pathlib import Path

OUT_PATH = Path('/usr/share/cups/doc-root/printer-status.json')


def run(cmd):
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
      return ''
    return proc.stdout


def parse_lpstat_v(text):
    devices = {}
    for line in text.splitlines():
      m = re.match(r'^device for (.+?):\s+(.+)$', line.strip())
      if m:
        devices[m.group(1)] = m.group(2)
    return devices


def parse_lpstat_p(text):
    states = {}
    for line in text.splitlines():
      m = re.match(r'^printer\s+(\S+)\s+is\s+(.+?)\.', line.strip())
      if m:
        states[m.group(1)] = m.group(2)
    return states


def parse_ipp_attributes(printer_name):
    attrs = {
      'job_impressions_completed': None,
      'marker_levels': [],
      'make_and_model': None,
      'queued_job_count': None,
    }
    cmd = [
      'ipptool', '-tv',
      f'ipp://localhost/printers/{printer_name}',
      '/usr/share/cups/ipptool/get-printer-attributes.test',
    ]
    out = run(cmd)
    for line in out.splitlines():
      s = line.strip()
      if s.startswith('marker-levels'):
        value = s.split('=', 1)[-1].strip()
        attrs['marker_levels'] = [v.strip() for v in value.split(',') if v.strip()]
      elif s.startswith('job-impressions-completed'):
        value = s.split('=', 1)[-1].strip()
        attrs['job_impressions_completed'] = value
      elif s.startswith('printer-make-and-model'):
        attrs['make_and_model'] = s.split('=', 1)[-1].strip()
      elif s.startswith('queued-job-count'):
        attrs['queued_job_count'] = s.split('=', 1)[-1].strip()
    return attrs


def host_from_uri(uri):
    m = re.match(r'^[a-z]+://([^/:]+)', uri)
    return m.group(1) if m else None


def resolve_host(host):
    if not host:
      return None
    try:
      return socket.gethostbyname(host)
    except Exception:
      return None


def build_snapshot():
    devices = parse_lpstat_v(run(['lpstat', '-v']))
    states = parse_lpstat_p(run(['lpstat', '-p']))

    printers = []
    for name, uri in devices.items():
      host = host_from_uri(uri)
      ipp = parse_ipp_attributes(name)
      printers.append({
        'name': name,
        'device_uri': uri,
        'state': states.get(name, 'unknown'),
        'host': host,
        'ip_address': resolve_host(host),
        'make_and_model': ipp['make_and_model'],
        'queued_job_count': ipp['queued_job_count'],
        'job_impressions_completed': ipp['job_impressions_completed'],
        'marker_levels': ipp['marker_levels'],
      })

    return {
      'generated_at': datetime.now(timezone.utc).isoformat(),
      'printers': printers,
      'note': 'Some printers do not expose ink levels/pages in IPP attributes; fields may be null.'
    }


def main():
    data = build_snapshot()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUT_PATH.with_suffix('.tmp')
    with tmp.open('w', encoding='utf-8') as f:
      json.dump(data, f, indent=2)
    tmp.replace(OUT_PATH)


if __name__ == '__main__':
    main()
