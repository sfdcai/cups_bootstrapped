(function () {
  var STORAGE_KEY = 'cups_theme';
  var DEFAULT_THEME = 'aurora';

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
    { id: 'royal', label: 'Royal Velvet' }
  ];

  function getSavedTheme() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      return saved || DEFAULT_THEME;
    } catch (err) {
      return DEFAULT_THEME;
    }
  }

  function saveTheme(themeId) {
    try {
      localStorage.setItem(STORAGE_KEY, themeId);
    } catch (err) {
      // Ignore storage errors and still apply in-memory.
    }
  }

  function applyTheme(themeId) {
    var safeTheme = themeId || DEFAULT_THEME;
    document.body.setAttribute('data-theme', safeTheme);

    var select = document.getElementById('theme-picker');
    if (select && select.value !== safeTheme) {
      select.value = safeTheme;
    }

    var buttons = document.querySelectorAll('[data-theme-option]');
    for (var i = 0; i < buttons.length; i++) {
      var option = buttons[i].getAttribute('data-theme-option');
      var isActive = option === safeTheme;
      buttons[i].classList.toggle('active', isActive);
      buttons[i].setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }

    var label = document.getElementById('theme-current-label');
    if (label) {
      var readable = safeTheme;
      for (var j = 0; j < THEMES.length; j++) {
        if (THEMES[j].id === safeTheme) {
          readable = THEMES[j].label;
          break;
        }
      }
      label.textContent = readable;
    }
  }

  function onThemeChange(themeId) {
    applyTheme(themeId);
    saveTheme(themeId);
  }

  function initThemePicker() {
    var select = document.getElementById('theme-picker');
    if (!select) {
      return;
    }

    if (!select.options.length) {
      for (var i = 0; i < THEMES.length; i++) {
        var theme = THEMES[i];
        var opt = document.createElement('option');
        opt.value = theme.id;
        opt.textContent = theme.label;
        select.appendChild(opt);
      }
    }

    select.addEventListener('change', function () {
      onThemeChange(select.value);
    });
  }

  function initThemeButtons() {
    var buttons = document.querySelectorAll('[data-theme-option]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        var selected = this.getAttribute('data-theme-option');
        onThemeChange(selected);
      });
    }
  }

  function initResetButton() {
    var reset = document.getElementById('theme-reset');
    if (!reset) {
      return;
    }

    reset.addEventListener('click', function () {
      onThemeChange(DEFAULT_THEME);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initThemePicker();
    initThemeButtons();
    initResetButton();
    applyTheme(getSavedTheme());
  });
})();
