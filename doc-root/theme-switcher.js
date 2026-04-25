(function () {
  var STORAGE_KEY = 'cups_theme';
  var MODE_KEY = 'cups_theme_mode';
  var DAY_THEME_KEY = 'cups_theme_day';
  var NIGHT_THEME_KEY = 'cups_theme_night';
  var DAY_START_KEY = 'cups_theme_day_start';
  var NIGHT_START_KEY = 'cups_theme_night_start';

  var DEFAULT_THEME = 'aurora';
  var DEFAULT_MODE = 'manual';
  var DEFAULT_DAY_THEME = 'aurora';
  var DEFAULT_NIGHT_THEME = 'royal';
  var DEFAULT_DAY_START = 7;
  var DEFAULT_NIGHT_START = 19;

  var THEMES = [
    { id: 'aurora', label: 'Aurora Glass' },
    { id: 'terminal', label: 'Terminal Ops' },
    { id: 'paper', label: 'Paper Ledger' },
    { id: 'sunset', label: 'Sunset Metro' },
    { id: 'forest', label: 'Forest Console' },
    { id: 'candy', label: 'Candy Pop' },
    { id: 'mono', label: 'Monochrome Ink' },
    { id: 'oceanic', label: 'Oceanic Depth' },
    { id: 'sand', label: 'Desert Sand' },
    { id: 'royal', label: 'Royal Velvet' },
    { id: 'brutal', label: 'Neo Brutalist' },
    { id: 'zen', label: 'Zen Garden' }
  ];

  function getStorageItem(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (err) {
      return fallback;
    }
  }

  function setStorageItem(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (err) {
      // Ignore storage errors and still apply in-memory.
    }
  }

  function themeExists(themeId) {
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === themeId) {
        return true;
      }
    }
    return false;
  }

  function safeTheme(themeId, fallback) {
    if (themeExists(themeId)) {
      return themeId;
    }
    return fallback;
  }

  function getThemeLabel(themeId) {
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === themeId) {
        return THEMES[i].label;
      }
    }
    return themeId;
  }

  function parseHour(raw, fallback) {
    var value = parseInt(raw, 10);
    if (isNaN(value) || value < 0 || value > 23) {
      return fallback;
    }
    return value;
  }

  function getMode() {
    var mode = getStorageItem(MODE_KEY, DEFAULT_MODE);
    return mode === 'auto' ? 'auto' : 'manual';
  }

  function getSavedTheme() {
    return safeTheme(getStorageItem(STORAGE_KEY, DEFAULT_THEME), DEFAULT_THEME);
  }

  function saveTheme(themeId) {
    setStorageItem(STORAGE_KEY, safeTheme(themeId, DEFAULT_THEME));
  }

  function getScheduleSettings() {
    return {
      dayTheme: safeTheme(getStorageItem(DAY_THEME_KEY, DEFAULT_DAY_THEME), DEFAULT_DAY_THEME),
      nightTheme: safeTheme(getStorageItem(NIGHT_THEME_KEY, DEFAULT_NIGHT_THEME), DEFAULT_NIGHT_THEME),
      dayStart: parseHour(getStorageItem(DAY_START_KEY, String(DEFAULT_DAY_START)), DEFAULT_DAY_START),
      nightStart: parseHour(getStorageItem(NIGHT_START_KEY, String(DEFAULT_NIGHT_START)), DEFAULT_NIGHT_START)
    };
  }

  function saveScheduleSettings(settings) {
    setStorageItem(DAY_THEME_KEY, safeTheme(settings.dayTheme, DEFAULT_DAY_THEME));
    setStorageItem(NIGHT_THEME_KEY, safeTheme(settings.nightTheme, DEFAULT_NIGHT_THEME));
    setStorageItem(DAY_START_KEY, parseHour(settings.dayStart, DEFAULT_DAY_START));
    setStorageItem(NIGHT_START_KEY, parseHour(settings.nightStart, DEFAULT_NIGHT_START));
  }

  function isNightHour(hour, dayStart, nightStart) {
    if (dayStart === nightStart) {
      return hour >= nightStart;
    }

    if (nightStart > dayStart) {
      return hour >= nightStart || hour < dayStart;
    }

    return hour >= nightStart && hour < dayStart;
  }

  function resolveThemeForNow() {
    var mode = getMode();
    if (mode === 'manual') {
      return getSavedTheme();
    }

    var settings = getScheduleSettings();
    var hour = new Date().getHours();
    if (isNightHour(hour, settings.dayStart, settings.nightStart)) {
      return settings.nightTheme;
    }

    return settings.dayTheme;
  }

  function updateScheduleSummary() {
    var summary = document.getElementById('theme-schedule-label');
    if (!summary) {
      return;
    }

    var mode = getMode();
    if (mode === 'manual') {
      summary.textContent = 'Manual mode active';
      return;
    }

    var s = getScheduleSettings();
    var format = function (h) {
      return (h < 10 ? '0' + h : String(h)) + ':00';
    };
    summary.textContent =
      'Auto mode: Day ' + getThemeLabel(s.dayTheme) + ' from ' + format(s.dayStart) +
      ' / Night ' + getThemeLabel(s.nightTheme) + ' from ' + format(s.nightStart);
  }

  function syncStudioControls() {
    var mode = getMode();
    var settings = getScheduleSettings();

    var modeSelect = document.getElementById('theme-mode');
    if (modeSelect) {
      modeSelect.value = mode;
    }

    var dayPicker = document.getElementById('day-theme-picker');
    if (dayPicker) {
      dayPicker.value = settings.dayTheme;
      dayPicker.disabled = mode !== 'auto';
    }

    var nightPicker = document.getElementById('night-theme-picker');
    if (nightPicker) {
      nightPicker.value = settings.nightTheme;
      nightPicker.disabled = mode !== 'auto';
    }

    var dayStart = document.getElementById('day-start-hour');
    if (dayStart) {
      dayStart.value = settings.dayStart;
      dayStart.disabled = mode !== 'auto';
    }

    var nightStart = document.getElementById('night-start-hour');
    if (nightStart) {
      nightStart.value = settings.nightStart;
      nightStart.disabled = mode !== 'auto';
    }

    updateScheduleSummary();
  }

  function applyTheme(themeId) {
    var safe = safeTheme(themeId, DEFAULT_THEME);
    document.body.setAttribute('data-theme', safe);

    var select = document.getElementById('theme-picker');
    if (select && select.value !== safe) {
      select.value = safe;
    }

    var buttons = document.querySelectorAll('[data-theme-option]');
    for (var i = 0; i < buttons.length; i++) {
      var option = buttons[i].getAttribute('data-theme-option');
      var active = option === safe;
      buttons[i].classList.toggle('active', active);
      buttons[i].setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    var currentLabel = document.getElementById('theme-current-label');
    if (currentLabel) {
      currentLabel.textContent = getThemeLabel(safe);
    }
  }

  function applyCurrentTheme() {
    applyTheme(resolveThemeForNow());
    syncStudioControls();
  }

  function onThemeChange(themeId) {
    var selected = safeTheme(themeId, DEFAULT_THEME);
    var mode = getMode();

    if (mode === 'auto') {
      var settings = getScheduleSettings();
      var hour = new Date().getHours();
      if (isNightHour(hour, settings.dayStart, settings.nightStart)) {
        settings.nightTheme = selected;
      } else {
        settings.dayTheme = selected;
      }
      saveScheduleSettings(settings);
    } else {
      saveTheme(selected);
    }

    applyCurrentTheme();
  }

  function fillThemeOptions(select) {
    if (!select || select.options.length) {
      return;
    }

    for (var i = 0; i < THEMES.length; i++) {
      var theme = THEMES[i];
      var opt = document.createElement('option');
      opt.value = theme.id;
      opt.textContent = theme.label;
      select.appendChild(opt);
    }
  }

  function initThemePicker() {
    var picker = document.getElementById('theme-picker');
    fillThemeOptions(picker);

    if (!picker) {
      return;
    }

    picker.addEventListener('change', function () {
      onThemeChange(picker.value);
    });
  }

  function initThemeButtons() {
    var buttons = document.querySelectorAll('[data-theme-option]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        onThemeChange(this.getAttribute('data-theme-option'));
      });
    }
  }

  function initResetButton() {
    var reset = document.getElementById('theme-reset');
    if (!reset) {
      return;
    }

    reset.addEventListener('click', function () {
      setStorageItem(MODE_KEY, DEFAULT_MODE);
      saveTheme(DEFAULT_THEME);
      saveScheduleSettings({
        dayTheme: DEFAULT_DAY_THEME,
        nightTheme: DEFAULT_NIGHT_THEME,
        dayStart: DEFAULT_DAY_START,
        nightStart: DEFAULT_NIGHT_START
      });
      applyCurrentTheme();
    });
  }

  function initSchedulerControls() {
    var modeSelect = document.getElementById('theme-mode');
    if (modeSelect) {
      modeSelect.addEventListener('change', function () {
        setStorageItem(MODE_KEY, modeSelect.value === 'auto' ? 'auto' : 'manual');
        applyCurrentTheme();
      });
    }

    var dayPicker = document.getElementById('day-theme-picker');
    fillThemeOptions(dayPicker);
    if (dayPicker) {
      dayPicker.addEventListener('change', function () {
        var settings = getScheduleSettings();
        settings.dayTheme = dayPicker.value;
        saveScheduleSettings(settings);
        applyCurrentTheme();
      });
    }

    var nightPicker = document.getElementById('night-theme-picker');
    fillThemeOptions(nightPicker);
    if (nightPicker) {
      nightPicker.addEventListener('change', function () {
        var settings = getScheduleSettings();
        settings.nightTheme = nightPicker.value;
        saveScheduleSettings(settings);
        applyCurrentTheme();
      });
    }

    var dayStart = document.getElementById('day-start-hour');
    if (dayStart) {
      dayStart.addEventListener('change', function () {
        var settings = getScheduleSettings();
        settings.dayStart = parseHour(dayStart.value, DEFAULT_DAY_START);
        saveScheduleSettings(settings);
        applyCurrentTheme();
      });
    }

    var nightStart = document.getElementById('night-start-hour');
    if (nightStart) {
      nightStart.addEventListener('change', function () {
        var settings = getScheduleSettings();
        settings.nightStart = parseHour(nightStart.value, DEFAULT_NIGHT_START);
        saveScheduleSettings(settings);
        applyCurrentTheme();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initThemePicker();
    initThemeButtons();
    initResetButton();
    initSchedulerControls();
    applyCurrentTheme();

    if (getMode() === 'auto') {
      setInterval(applyCurrentTheme, 60000);
    }
  });
})();
