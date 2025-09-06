// Minimal loader to fetch and inject the settings dialog, then show it.
(function () {
	'use strict';

	// Path to the dialog file relative to the index.html
	var DIALOG_PATH = 'dialogs/settings_dialog.html';

	// Load the dialog HTML and inject into document body if not already present
	function ensureDialogLoaded() {
		return new Promise(function (resolve, reject) {
			if (document.getElementById('settingsModal')) {
				return resolve();
			}

			fetch(DIALOG_PATH, { cache: 'no-cache' })
				.then(function (resp) {
					if (!resp.ok) throw new Error('Failed to load dialog: ' + resp.status);
					return resp.text();
				})
				.then(function (html) {
					var container = document.createElement('div');
					container.innerHTML = html; // modal root element is inside
					// Move children into body
					while (container.firstChild) {
						document.body.appendChild(container.firstChild);
					}
					resolve();
				})
				.catch(reject);
		});
	}

	// Show the settings modal using Bootstrap's JS API
	function showSettingsModal() {
		var modalEl = document.getElementById('settingsModal');
		if (!modalEl) return;
		var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
		modal.show();
	}

	// Wire button
		function init() {
			// Use event delegation so dynamically-injected buttons in components work.
			document.addEventListener('click', function (ev) {
				var tgt = ev.target;
				if (!tgt) return;
				var isNavSettings = tgt.id === 'open-settings' || (tgt.closest && tgt.closest('#open-settings'));
				var isSidebarSettings = tgt.id === 'open-settings-sidebar' || (tgt.closest && tgt.closest('#open-settings-sidebar'));
				if (isNavSettings || isSidebarSettings) {
					ensureDialogLoaded()
						.then(showSettingsModal)
						.catch(function (err) {
							console.error(err);
						});
				}
			});
		}

	// Initialize when DOM is ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
