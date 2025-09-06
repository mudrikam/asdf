// Footer loader: fetches the footer fragment and appends it to <body>
(function () {
	'use strict';

	var FOOTER_PATH = 'views/components/footer/footer.html';

	function fetchFragment(path) {
		return fetch(path, { cache: 'no-cache' }).then(function (r) {
			if (!r.ok) throw new Error('Failed to load footer: ' + r.status);
			return r.text();
		});
	}

	function injectFooter(html) {
		var div = document.createElement('div');
		div.innerHTML = html;
		// Append the footer fragment to body so fixed-bottom footer works
		document.body.appendChild(div);

		// After footer is injected, try to fetch latest commit SHA from GitHub
		try {
			fetchLatestCommit().then(function (sha) {
				if (!sha) return;
				var footerSmall = div.querySelector('small.text-muted');
				if (!footerSmall) return;
				var a = document.createElement('a');
				a.href = 'https://github.com/mudrikam/dsna-meta/commit/' + sha;
				a.target = '_blank';
				a.rel = 'noopener noreferrer';
				// Create a pill badge with icon + short SHA
				var span = document.createElement('span');
				span.className = 'badge rounded-pill bg-secondary text-white ms-2';
				span.innerHTML = '<i class="fa-solid fa-code-commit me-1" aria-hidden="true"></i>' + sha.slice(0, 7);
				a.appendChild(span);
				footerSmall.appendChild(a);
			}).catch(function (err) { console.error('Failed to fetch latest commit', err); });
		} catch (e) { console.error(e); }
	}

	function fetchLatestCommit() {
		var api = 'https://api.github.com/repos/mudrikam/dsna-meta/commits?per_page=1';
		return fetch(api, { cache: 'no-cache' }).then(function (r) {
			if (!r.ok) return null;
			return r.json();
		}).then(function (data) {
			if (!data || !data[0] || !data[0].sha) return null;
			return data[0].sha;
		}).catch(function () { return null; });
	}

	function initFooter() {
		fetchFragment(FOOTER_PATH).then(injectFooter).catch(function (err) { console.error(err); });
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initFooter); else initFooter();
})();
