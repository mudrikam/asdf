// Navbar-specific initialization (desktop controls)
(function () {
  'use strict';

  function updateDropdownLabel(theme) {
    var btn = document.getElementById('themeDropdownBtn');
    if (!btn) return;
    var iconHtml = '';
    var text = '';
    if (theme === 'light') { iconHtml = '<i class="fa-solid fa-sun me-1"></i>'; text = 'Light'; }
    else if (theme === 'dark') { iconHtml = '<i class="fa-solid fa-moon me-1"></i>'; text = 'Dark'; }
    else { iconHtml = '<i class="fa-solid fa-circle-half-stroke me-1"></i>'; text = 'Auto'; }
    btn.innerHTML = iconHtml + text;
  }

  function initNavbarComponents() {
    // Initialize label from stored theme
    var initial = (function getStoredTheme() { try { return localStorage.getItem('dsna:theme') || 'auto'; } catch (e) { return 'auto'; } })();
    updateDropdownLabel(initial);

    // Clicking settings in navbar handled by dsna-meta.js via delegation; nothing else needed here.
  }

  window.initNavbarComponents = initNavbarComponents;
})();
