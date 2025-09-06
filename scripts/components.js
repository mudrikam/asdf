// Simple component loader for small HTML fragments.
(function () {
	'use strict';

	var NAV_PATH = 'components/navbar/navbar.html';
	var SIDEBAR_PATH = 'components/sidebar/sidebar.html';

	function loadFragment(path) {
		return fetch(path, { cache: 'no-cache' }).then(function (resp) {
			if (!resp.ok) throw new Error('Failed to load: ' + path + ' (' + resp.status + ')');
			return resp.text();
		});
	}

	function injectHtml(containerSelector, html) {
		var container = document.querySelector(containerSelector);
		if (!container) return;
		container.innerHTML = html;
	}

	function initNavbar() {
		// Load navbar and sidebar components in parallel
		Promise.all([loadFragment(NAV_PATH), loadFragment(SIDEBAR_PATH)])
			.then(function (results) {
				var html = results[0];
				var sidebarHtml = results[1];
				injectHtml('#navbar-container', html);
				injectHtml('#sidebar-container', sidebarHtml);

					// Auto-collapse behavior: when a clickable nav element is used, collapse the navbar if it's currently shown (mobile)
					document.addEventListener('click', function (ev) {
						var btn = ev.target;
						if (!btn) return;
						// If the clicked element is the settings button or any link inside the navbar, close the collapse
						var collapseEl = document.getElementById('mainNavbarCollapse');
						if (!collapseEl) return;
						var bsCollapse = bootstrap.Collapse.getInstance(collapseEl);

						var insideNavbar = btn.closest && btn.closest('#mainNavbarCollapse');
						if (insideNavbar && collapseEl.classList.contains('show')) {
							// If the click is inside a dropdown (toggle or menu), don't auto-collapse
							var inDropdown = btn.closest && btn.closest('.dropdown');
							if (inDropdown) return;

							if (!bsCollapse) {
								bsCollapse = new bootstrap.Collapse(collapseEl, { toggle: false });
							}
							bsCollapse.hide();
						}
					});

					// Theme management
					var THEME_KEY = 'dsna:theme';

					function applyTheme(theme) {
						var root = document.documentElement;
						if (theme === 'light') {
							root.setAttribute('data-bs-theme', 'light');
						} else if (theme === 'dark') {
							root.setAttribute('data-bs-theme', 'dark');
						} else {
							// auto: follow system
							var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
							root.setAttribute('data-bs-theme', prefersDark ? 'dark' : 'light');
						}
					}

					function setStoredTheme(theme) {
						try {
							localStorage.setItem(THEME_KEY, theme);
						} catch (e) {
							console.warn('Could not persist theme', e);
						}
					}

					function getStoredTheme() {
						try {
							return localStorage.getItem(THEME_KEY) || 'auto';
						} catch (e) {
							return 'auto';
						}
					}

					function handleThemeClick(ev) {
						var btn = ev.target;
						if (!btn || !btn.dataset) return;
						var chosen = btn.dataset.theme;
						if (!chosen) return;
						setStoredTheme(chosen);
						applyTheme(chosen);
						updateDropdownActive(chosen);
					}

					function updateDropdownActive(activeTheme) {
						['light', 'dark', 'auto'].forEach(function (t) {
							var el = document.querySelector('#theme-' + t);
							if (!el) return;
							if (t === activeTheme) el.classList.add('active'); else el.classList.remove('active');
						});
					}

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

					// Attach handler to theme buttons (delegated)
					document.addEventListener('click', function (ev) {
						var t = ev.target;
						if (t && t.dataset && t.dataset.theme) {
							handleThemeClick(ev);
						}
					});

					// Listen for system theme changes when in auto mode
					if (window.matchMedia) {
						var mq = window.matchMedia('(prefers-color-scheme: dark)');
						mq.addEventListener ? mq.addEventListener('change', function () {
							if (getStoredTheme() === 'auto') applyTheme('auto');
						}) : mq.addListener && mq.addListener(function () {
							if (getStoredTheme() === 'auto') applyTheme('auto');
						});
					}

					// Initialize theme state on load
					var initial = getStoredTheme();
					applyTheme(initial);
					updateDropdownActive(initial);
					updateDropdownLabel(initial);
			})
			.catch(function (err) {
				console.error(err);
			});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initNavbar);
	} else {
		initNavbar();
	}
})();
