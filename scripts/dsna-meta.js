// Minimal loader to fetch and inject the settings dialog, then show it.
(function () {
	'use strict';

	// Fetch the HTML fragment that contains ordered <script> tags and
	// inject it into the document so the browser executes them in order.
	function fetchAndInjectScriptFragment(fragmentPath) {
		return fetch(fragmentPath, { cache: 'no-cache' }).then(function (res) {
			if (!res.ok) throw new Error('Failed to fetch ' + fragmentPath + ' (' + res.status + ')');
			return res.text();
		}).then(function (html) {
			// Create a container to parse the fragment
			var container = document.createElement('div');
			container.innerHTML = html;

			// Move each script node into the document head in order. Using
			// DOM insertion ensures the scripts execute in sequence.
			var scripts = container.querySelectorAll('script');
			var promises = Array.prototype.map.call(scripts, function (s) {
				return new Promise(function (resolve, reject) {
					var ns = document.createElement('script');
					if (s.src) ns.src = s.src;
					if (s.type) ns.type = s.type;
					// Preserve inline script content if any
					if (!s.src) ns.text = s.textContent;
					ns.onload = function () { resolve(s.src || 'inline'); };
					ns.onerror = function () { reject(new Error('Failed to load script ' + (s.src || '<inline>'))); };
					document.head.appendChild(ns);
				});
			});

			// Return a promise that resolves when all scripts have loaded
			return promises.reduce(function (p, cur) {
				return p.then(function () { return cur; });
			}, Promise.resolve());
		});
	}

	var fragment = 'scripts/scripts.html';
	fetchAndInjectScriptFragment(fragment).then(function () {
		console.log('All UI scripts injected and executed');
	}).catch(function (err) {
		console.error('Failed injecting UI script fragment', err);
	});
})();
