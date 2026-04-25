(function () {
  var API_BASE = 'https://' + window.location.hostname + ':6310/api';

  function byId(id) {
    return document.getElementById(id);
  }

  function renderStatus(data) {
    byId('schedule-status').textContent = JSON.stringify(data, null, 2);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderPrinters(snapshot) {
    var root = byId('printer-cards');
    if (!root) {
      return;
    }

    var printers = snapshot && snapshot.printers ? snapshot.printers : [];
    if (!printers.length) {
      root.innerHTML = '<div class="col-12"><div class="theme-status-box">No printer telemetry available yet.</div></div>';
      return;
    }

    var html = '';
    for (var i = 0; i < printers.length; i++) {
      var p = printers[i];
      html += '<div class="col-lg-6 mb-3">';
      html += '<div class="theme-status-box h-100">';
      html += '<h3 class="h5">' + escapeHtml(p.name || 'Unknown') + '</h3>';
      html += '<p class="mb-1"><strong>State:</strong> ' + escapeHtml(p.state || 'unknown') + '</p>';
      html += '<p class="mb-1"><strong>Device URI:</strong> ' + escapeHtml(p.device_uri || 'n/a') + '</p>';
      html += '<p class="mb-1"><strong>Current IP:</strong> ' + escapeHtml(p.ip_address || 'n/a') + '</p>';
      html += '<p class="mb-1"><strong>Model:</strong> ' + escapeHtml(p.make_and_model || 'n/a') + '</p>';
      html += '<p class="mb-1"><strong>Job Count:</strong> ' + escapeHtml(p.queued_job_count != null ? p.queued_job_count : 'n/a') + '</p>';
      html += '<p class="mb-1"><strong>Pages Printed:</strong> ' + escapeHtml(p.job_impressions_completed != null ? p.job_impressions_completed : 'not exposed') + '</p>';
      html += '<p class="mb-1"><strong>Ink/Supply Levels:</strong> ' + escapeHtml(p.marker_levels && p.marker_levels.length ? p.marker_levels.join(', ') : 'not exposed by printer') + '</p>';
      html += '</div></div>';
    }

    root.innerHTML = html;
  }

  function populatePrinters(printers, selected) {
    var select = byId('ka-printer');
    if (!select) {
      return;
    }

    select.innerHTML = '';
    for (var i = 0; i < printers.length; i++) {
      var opt = document.createElement('option');
      opt.value = printers[i];
      opt.textContent = printers[i];
      if (selected && printers[i] === selected) {
        opt.selected = true;
      }
      select.appendChild(opt);
    }
  }

  function fetchJson(url) {
    return fetch(url, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) {
        throw new Error('HTTP ' + r.status + ' for ' + url);
      }
      return r.json();
    });
  }

  function refreshAll() {
    return Promise.all([
      fetchJson(API_BASE + '/status'),
      fetchJson('/printer-status.json?_=' + Date.now())
    ]).then(function (results) {
      var status = results[0];
      var snapshot = results[1];
      renderStatus(status);
      renderPrinters(snapshot);
      populatePrinters(status.printers || [], status.config ? status.config.printer : null);
    }).catch(function (err) {
      byId('schedule-status').textContent = 'Failed to load data: ' + err.message;
    });
  }

  function postAction(action) {
    return fetch(API_BASE + '/' + action, {
      method: 'POST',
      credentials: 'omit'
    }).then(function (r) {
      return r.json();
    });
  }

  function initForm() {
    var form = byId('keepalive-form');
    if (!form) {
      return;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var fd = new FormData(form);
      fetch(API_BASE + '/upload_schedule', {
        method: 'POST',
        body: fd,
        credentials: 'omit'
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (res) {
          renderStatus(res);
          return refreshAll();
        })
        .catch(function (err) {
          byId('schedule-status').textContent = 'Upload failed: ' + err.message;
        });
    });
  }

  function initActions() {
    var runNow = byId('run-now');
    var disable = byId('disable-schedule');
    var refresh = byId('refresh-status');

    if (runNow) {
      runNow.addEventListener('click', function () {
        postAction('run_now').then(refreshAll).catch(function (err) {
          byId('schedule-status').textContent = 'Run failed: ' + err.message;
        });
      });
    }

    if (disable) {
      disable.addEventListener('click', function () {
        postAction('disable').then(refreshAll).catch(function (err) {
          byId('schedule-status').textContent = 'Disable failed: ' + err.message;
        });
      });
    }

    if (refresh) {
      refresh.addEventListener('click', function () {
        refreshAll();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initForm();
    initActions();
    refreshAll();
  });
})();
