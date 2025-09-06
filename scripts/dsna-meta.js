// Minimal loader to fetch and inject the settings dialog, then show it.
(function () {
	'use strict';

	// Simple script loader that appends scripts in order and returns a Promise
	function loadScript(src) {
		return new Promise(function (resolve, reject) {
			var s = document.createElement('script');
			s.src = src;
			s.onload = resolve;
			s.onerror = function (e) { reject(new Error('Failed to load ' + src)); };
			document.head.appendChild(s);
		});
	}

	// Load scripts in sequence
	var scriptsToLoad = [
		'scripts/navbar.js',
		'scripts/sidebar.js',
		'scripts/components.js',
		'scripts/settings.js'
	];

	function loadAll() {
		return scriptsToLoad.reduce(function (p, src) {
			return p.then(function () { return loadScript(src); });
		}, Promise.resolve());
	}

	loadAll().then(function () {
		// All scripts loaded; components.js will inject HTML and call init hooks.
		console.log('All UI scripts loaded');
	}).catch(function (err) {
		console.error('Failed loading UI scripts', err);
	});
})();
