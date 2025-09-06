// Settings dialog loader and handler
(function () {
  'use strict';

  var DIALOG_PATH = 'dialogs/settings_dialog.html';

  function ensureDialogLoaded() {
    return new Promise(function (resolve, reject) {
      if (document.getElementById('settingsModal')) return resolve();
      fetch(DIALOG_PATH, { cache: 'no-cache' })
        .then(function (resp) {
          if (!resp.ok) throw new Error('Failed to load dialog: ' + resp.status);
          return resp.text();
        })
        .then(function (html) {
          var container = document.createElement('div');
          container.innerHTML = html;
          while (container.firstChild) document.body.appendChild(container.firstChild);
          resolve();
        })
        .catch(reject);
    });
  }

  function showSettingsModal() {
    var modalEl = document.getElementById('settingsModal');
    if (!modalEl) return;
    var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }

  function initSettingsComponents() {
    document.addEventListener('click', function (ev) {
      var tgt = ev.target;
      if (!tgt) return;
      var isNavSettings = tgt.id === 'open-settings' || (tgt.closest && tgt.closest('#open-settings'));
      var isSidebarSettings = tgt.id === 'open-settings-sidebar' || (tgt.closest && tgt.closest('#open-settings-sidebar'));
      if (isNavSettings || isSidebarSettings) {
        // If sidebar settings was clicked, also hide offcanvas for mobile UX
        if (isSidebarSettings) {
          var off = document.getElementById('sideMenu');
          if (off) {
            var oc = bootstrap.Offcanvas.getInstance(off) || new bootstrap.Offcanvas(off);
            oc.hide();
          }
        }

        ensureDialogLoaded().then(showSettingsModal).catch(function (err) { console.error(err); });
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSettingsComponents); else initSettingsComponents();

  window.initSettingsComponents = initSettingsComponents;
})();
