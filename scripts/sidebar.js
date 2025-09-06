// Sidebar-specific initialization (mobile/offcanvas controls + theme handling)
(function () {
  'use strict';

  var THEME_KEY = 'dsna:theme';

  function applyTheme(theme) {
    var root = document.documentElement;
    if (theme === 'light') root.setAttribute('data-bs-theme', 'light');
    else if (theme === 'dark') root.setAttribute('data-bs-theme', 'dark');
    else {
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-bs-theme', prefersDark ? 'dark' : 'light');
    }
  }

  function setStoredTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { console.warn('Could not persist theme', e); }
  }

  function getStoredTheme() { try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) { return 'auto'; } }

  function updateDropdownActive(activeTheme) {
    ['light', 'dark', 'auto'].forEach(function (t) {
      var el = document.querySelector('[data-theme="' + t + '"]');
      if (!el) return;
      if (t === activeTheme) el.classList.add('active'); else el.classList.remove('active');
    });
  }

  function initSidebarComponents() {
    // Delegate clicks for theme buttons inside sidebar
    document.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!t) return;
      // if clicked element or its ancestor has data-theme attribute
      var btn = t.closest && t.closest('[data-theme]');
      if (btn && btn.dataset && btn.dataset.theme) {
        var chosen = btn.dataset.theme;
        setStoredTheme(chosen);
        applyTheme(chosen);
        updateDropdownActive(chosen);

        // If offcanvas is open, close it for a smoother mobile UX
        var off = document.getElementById('sideMenu');
        if (off) {
          var oc = bootstrap.Offcanvas.getInstance(off) || new bootstrap.Offcanvas(off);
          oc.hide();
        }
      }

      // Sidebar settings button handled by dsna-meta.js via delegation; nothing more here.
    });

    // Listen for system theme changes when in auto mode
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener ? mq.addEventListener('change', function () { if (getStoredTheme() === 'auto') applyTheme('auto'); }) : mq.addListener && mq.addListener(function () { if (getStoredTheme() === 'auto') applyTheme('auto'); });
    }

    // Initialize theme from storage
    var initial = getStoredTheme();
    applyTheme(initial);
    updateDropdownActive(initial);
  }

  window.initSidebarComponents = initSidebarComponents;
})();
