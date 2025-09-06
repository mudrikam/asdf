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

				// Call optional init hooks exported by navbar.js and sidebar.js
				try {
					if (window.initNavbarComponents) window.initNavbarComponents();
				} catch (e) {
					console.error('initNavbarComponents failed', e);
				}
				try {
					if (window.initSidebarComponents) window.initSidebarComponents();
				} catch (e) {
					console.error('initSidebarComponents failed', e);
				}
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
