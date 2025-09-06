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

  // Small helpers to persist an API key for the placeholder UI
  function attachSettingsBehavior() {
    var modalEl = document.getElementById('settingsModal');
    if (!modalEl) return;
    var saveBtn = modalEl.querySelector('#save-settings-btn');
    if (!saveBtn) return;
    var modelSelect = modalEl.querySelector('#model-select');

    // Populate model select from JSON config if present
    function populateModelSelect() {
      if (!modelSelect) return Promise.resolve();
      // avoid re-populating
      if (modelSelect._populated) return Promise.resolve();
      return fetch('configs/ai_configs.json', { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) return Promise.reject(new Error('Failed to load model config'));
        return r.json();
      }).then(function (cfg) {
        // clear existing options except placeholder
        var placeholder = modelSelect.querySelector('option[value=""]');
        modelSelect.innerHTML = '';
        if (placeholder) modelSelect.appendChild(placeholder);
        var models = cfg && cfg.models ? cfg.models : {};
        Object.keys(models).forEach(function (group) {
          var optg = document.createElement('optgroup');
          optg.label = group;
          models[group].forEach(function (m) {
            var opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            optg.appendChild(opt);
          });
          modelSelect.appendChild(optg);
        });
        modelSelect._populated = true;
      }).catch(function (err) { console.error('Failed to populate model select', err); });
    }

    // In-memory entries while editing in the modal. Persist to IndexedDB on Save.
    var entries = [];

    // When modal is shown, load current entries from DB and render table
    modalEl.addEventListener('shown.bs.modal', function () {
      // ensure model list is populated then load entries
      populateModelSelect().then(function () {
        return listEntries();
      }).then(function (items) {
        entries = items.slice();
        // store entries on modalEl for renderTable to pick up
        modalEl._entries = entries;
        renderTable(modalEl);
        wireAddDelete(modalEl, entries);
        saveBtn.disabled = entries.length === 0;
      }).catch(function (err) { console.error('Failed to load entries', err); });
    });

    // Save button no-op: Add persists immediately to IndexedDB. Close modal on Save.
    saveBtn.addEventListener('click', function () {
      var modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      console.log('Settings: modal closed (entries are persisted on Add)');
    });
  }

  // IndexedDB helpers for storing API key entries (name, api, model)
  var IDB_DBNAME = 'dsna-meta';
  var IDB_STORE = 'apiKeys';

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(IDB_DBNAME, 1);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          var os = db.createObjectStore(IDB_STORE, { keyPath: 'id', autoIncrement: true });
          os.createIndex('name', 'name', { unique: false });
        }
      };
      req.onsuccess = function (e) { resolve(e.target.result); };
      req.onerror = function (e) { reject(e.target.error); };
    });
  }

  function addEntry(entry) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction([IDB_STORE], 'readwrite');
        var store = tx.objectStore(IDB_STORE);
        var r = store.add(entry);
        r.onsuccess = function (ev) { resolve(ev.target.result); };
        r.onerror = function (ev) { reject(ev.target.error); };
      });
    });
  }

  function updateEntry(id, entry) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction([IDB_STORE], 'readwrite');
        var store = tx.objectStore(IDB_STORE);
        var r = store.put(Object.assign({}, entry, { id: id }));
        r.onsuccess = function (ev) { resolve(ev.target.result); };
        r.onerror = function (ev) { reject(ev.target.error); };
      });
    });
  }

  function setActiveEntry(id) {
    // Set the active flag only on the provided entry id and leave others untouched.
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction([IDB_STORE], 'readwrite');
        var store = tx.objectStore(IDB_STORE);
        var getReq = store.get(id);
        getReq.onsuccess = function (ev) {
          var rec = ev.target.result;
          if (!rec) return resolve();
          rec.active = true;
          var putReq = store.put(rec);
          putReq.onsuccess = function () { resolve(); };
          putReq.onerror = function (ev) { reject(ev.target.error); };
        };
        getReq.onerror = function (ev) { reject(ev.target.error); };
      });
    });
  }

  function listEntries() {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction([IDB_STORE], 'readonly');
        var store = tx.objectStore(IDB_STORE);
        var items = [];
        var cur = store.openCursor();
        cur.onsuccess = function (ev) {
          var c = ev.target.result;
          if (!c) {
            resolve(items);
            return;
          }
          items.push(c.value);
          c.continue();
        };
        cur.onerror = function (ev) { reject(ev.target.error); };
      });
    });
  }

  function deleteEntry(id) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction([IDB_STORE], 'readwrite');
        var store = tx.objectStore(IDB_STORE);
        var r = store.delete(id);
        r.onsuccess = function () { resolve(); };
        r.onerror = function (ev) { reject(ev.target.error); };
      });
    });
  }

  function renderTable(modalEl) {
    var tbody = modalEl.querySelector('#apikeys-table-body');
    if (!tbody) return;
    // Always read current entries from IndexedDB to ensure persistence across reloads
    listEntries().then(function (items) {
      tbody.innerHTML = '';
      items.forEach(function (it) {
        var tr = document.createElement('tr');
        var activeHtml = (it.active) ? '<i class="fas fa-check-circle text-success"></i>' : '';
        tr.innerHTML = '<td>' + activeHtml + '</td>' +
                       '<td>' + escapeHtml(it.name || '') + '</td>' +
                       '<td>' + escapeHtml(maskApi(it.api || '')) + '</td>' +
                       '<td>' + escapeHtml(it.model || '') + '</td>' +
                       '<td class="text-end">'
                         + '<button class="btn btn-sm btn-outline-primary btn-edit me-1" data-id="' + it.id + '" title="Edit"><i class="fas fa-edit"></i></button>'
                         + '<button class="btn btn-sm btn-danger btn-delete" data-id="' + it.id + '" title="Delete"><i class="fas fa-trash-alt"></i></button>'
                       + '</td>';
        tbody.appendChild(tr);
      });
    }).catch(function (err) { console.error('Failed to list entries', err); });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (m) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
  }

  function maskApi(s) {
    var t = String(s || '');
  if (t.length <= 10) return t.replace(/./g, '*');
  // Show five masked characters, then the last five characters.
  // Example: a very long key -> "*****abcde"
  var last = t.slice(-5);
  return '*****' + last;
  }

  function wireAddDelete(modalEl, entries) {
  if (modalEl._wired) return;
  modalEl._entries = entries;
  // Track whether the most recent Test succeeded for the current inputs
  modalEl._lastTestSucceeded = false;
    var addBtn = modalEl.querySelector('#add-apikey-btn');
    var nameInput = modalEl.querySelector('#apikey-name');
    var apiInput = modalEl.querySelector('#apikey-input');
    var modelSelect = modalEl.querySelector('#model-select');
    var tbody = modalEl.querySelector('#apikeys-table-body');
    if (!addBtn || !nameInput || !apiInput || !modelSelect || !tbody) return;

    var addClick = function () {
      var name = (nameInput.value || '').trim();
      var api = (apiInput.value || '').trim();
      var model = (modelSelect.value || '').trim();
      if (!name || !api || !model) return; // simple validation
      // Add entry with active=false by default; if the last Test succeeded
      // mark this new entry as active (setActiveEntry will clear others).
      addEntry({ name: name, api: api, model: model, active: false }).then(function (newId) {
        nameInput.value = '';
        apiInput.value = '';
        modelSelect.selectedIndex = 0;
        // If the user tested successfully before clicking Add, mark this as active
        if (modalEl._lastTestSucceeded) {
          setActiveEntry(newId).then(function () {
            modalEl._lastTestSucceeded = false;
            if (testResult) testResult.innerHTML = '';
            renderTable(modalEl);
          }).catch(function (err) { console.error('Failed to set active', err); renderTable(modalEl); });
        } else {
          if (testResult) testResult.innerHTML = '';
          renderTable(modalEl);
        }
      }).catch(function (err) { console.error('Failed to add entry', err); });
    };
    addBtn.addEventListener('click', addClick);

    // Delegate actions: delete, edit, set-active
    tbody.addEventListener('click', function (ev) {
      var del = ev.target.closest && ev.target.closest('.btn-delete');
      if (del) {
        var id = Number(del.getAttribute('data-id'));
        if (!id) return;
        // show confirm modal and on confirm delete
        var conf = document.getElementById('confirmDeleteModal');
        var confBtn = document.getElementById('confirm-delete-btn');
        var bs = bootstrap.Modal.getOrCreateInstance(conf);
        // remove previous handler
        var handler = function () {
          deleteEntry(id).then(function () { renderTable(modalEl); bs.hide(); }).catch(function (err) { console.error('Delete failed', err); bs.hide(); });
        };
        // ensure we don't accumulate handlers
        confBtn.replaceWith(confBtn.cloneNode(true));
        confBtn = document.getElementById('confirm-delete-btn');
        confBtn.addEventListener('click', handler);
        bs.show();
        return;
      }
      var edit = ev.target.closest && ev.target.closest('.btn-edit');
      if (edit) {
        var id = Number(edit.getAttribute('data-id'));
        if (!id) return;
        // load entry and populate inputs for editing
        listEntries().then(function (items) {
          var e = items.find(function (x) { return x.id === id; });
          if (!e) return;
          nameInput.value = e.name || '';
          apiInput.value = e.api || '';
          // select model option
          for (var i = 0; i < modelSelect.options.length; i++) {
            if (modelSelect.options[i].value === e.model) { modelSelect.selectedIndex = i; break; }
          }
          // switch Add button into Update mode
          addBtn.textContent = 'Update';
          addBtn.classList.remove('btn-primary');
          addBtn.classList.add('btn-warning');
          // replace click handler temporarily
          var updateHandler = function () {
            var name = (nameInput.value || '').trim();
            var api = (apiInput.value || '').trim();
            var model = (modelSelect.value || '').trim();
            if (!name || !api || !model) return;
            // perform the update first
            updateEntry(id, { name: name, api: api, model: model }).then(function () {
              var finishRestore = function () {
                nameInput.value = '';
                apiInput.value = '';
                modelSelect.selectedIndex = 0;
                renderTable(modalEl);
                // restore Add button
                addBtn.textContent = 'Add';
                addBtn.classList.remove('btn-warning');
                addBtn.classList.add('btn-primary');
                addBtn.removeEventListener('click', updateHandler);
                addBtn.addEventListener('click', addClick);
              };

              // If the user successfully tested the inputs before Update,
              // mark the updated entry as active (clearing other active flags).
              if (modalEl._lastTestSucceeded) {
                setActiveEntry(id).then(function () {
                  modalEl._lastTestSucceeded = false;
                  var tr = modalEl.querySelector('#test-result');
                  if (tr) tr.innerHTML = '';
                  finishRestore();
                }).catch(function (err) {
                  console.error('Set active failed', err);
                  finishRestore();
                });
              } else {
                finishRestore();
              }
            }).catch(function (err) { console.error('Update failed', err); });
          };
          // remove original add handler then attach update
          addBtn.removeEventListener('click', addClick);
          addBtn.addEventListener('click', updateHandler);
        });
        return;
      }
      var sa = ev.target.closest && ev.target.closest('.btn-set-active');
      if (sa) {
        var id = Number(sa.getAttribute('data-id'));
        if (!id) return;
        setActiveEntry(id).then(function () { renderTable(modalEl); }).catch(function (err) { console.error('Set active failed', err); });
        return;
      }
    });
    // Test button wiring
    var testBtn = modalEl.querySelector('#test-apikey-btn');
    var testResult = modalEl.querySelector('#test-result');
    if (testBtn && testResult) {
      testBtn.addEventListener('click', function () {
        var api = apiInput.value && apiInput.value.trim();
        var model = modelSelect.value && modelSelect.value.trim();
        if (!api || !model) {
          testResult.innerHTML = '<div class="text-danger">Provide API key and select a model to test.</div>';
          return;
        }
        testResult.innerHTML = '<div class="text-muted">Testing...</div>';
        // Implement Gemini and OpenAI test paths (curl equivalents)
        if (model.indexOf('gemini') === 0) {
          var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
          fetch(url, {
            method: 'POST',
            headers: {
              'x-goog-api-key': api,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Just say OK' }] }]
            })
          }).then(function (r) {
            if (r.ok) {
                  modalEl._lastTestSucceeded = true;
                  testResult.innerHTML = '<div class="text-success"><i class="fas fa-check-circle me-1"></i>Check: this API key is active and ready to use.</div>';
                } else {
                  modalEl._lastTestSucceeded = false;
                  console.error('Test failed, status:', r.status);
                  testResult.innerHTML = '<div class="text-danger"><i class="fas fa-times-circle me-1"></i>Invalid API key — check the key and selected model.</div>';
                }
          }).catch(function (err) {
            modalEl._lastTestSucceeded = false;
            console.error('Test error', err);
            testResult.innerHTML = '<div class="text-danger"><i class="fas fa-times-circle me-1"></i>Invalid API key — check the key and selected model.</div>';
          });
        } else if (model.indexOf('gpt-') === 0 || model.indexOf('gpt') === 0) {
          // OpenAI Responses API test (curl equivalent)
          var ourl = 'https://api.openai.com/v1/responses';
          fetch(ourl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + api
            },
            body: JSON.stringify({ model: model, input: 'Just say OK' })
          }).then(function (r) {
            if (r.ok) {
              modalEl._lastTestSucceeded = true;
              testResult.innerHTML = '<div class="text-success"><i class="fas fa-check-circle me-1"></i>Check: this API key is active and ready to use.</div>';
            } else {
              modalEl._lastTestSucceeded = false;
              console.error('Test failed, status:', r.status);
              testResult.innerHTML = '<div class="text-danger"><i class="fas fa-times-circle me-1"></i>Invalid API key — check the key and selected model.</div>';
            }
          }).catch(function (err) {
            modalEl._lastTestSucceeded = false;
            console.error('Test error', err);
            testResult.innerHTML = '<div class="text-danger"><i class="fas fa-times-circle me-1"></i>Invalid API key — check the key and selected model.</div>';
          });
        } else {
          testResult.innerHTML = '<div class="text-muted">Test for this model type is not implemented.</div>';
        }
      });
    }
  modalEl._wired = true;
  }

  // Save all entries array into IndexedDB (clear then add)
  function saveAllEntries(entries) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction([IDB_STORE], 'readwrite');
        var store = tx.objectStore(IDB_STORE);
        var clearReq = store.clear();
        clearReq.onsuccess = function () {
          if (!entries || entries.length === 0) return resolve();
          var remaining = entries.length;
          entries.forEach(function (e) {
            var r = store.add({ name: e.name, api: e.api, model: e.model });
            r.onsuccess = function () { remaining--; if (remaining === 0) resolve(); };
            r.onerror = function (ev) { reject(ev.target.error); };
          });
        };
        clearReq.onerror = function (ev) { reject(ev.target.error); };
      });
    });
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

        ensureDialogLoaded().then(function () {
          // Attach form behavior once the dialog is present
          attachSettingsBehavior();
          showSettingsModal();
        }).catch(function (err) { console.error(err); });
      }
    });

    // If the dialog is already in the page (unlikely), attach behavior immediately
    if (document.getElementById('settingsModal')) attachSettingsBehavior();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSettingsComponents); else initSettingsComponents();

  window.initSettingsComponents = initSettingsComponents;
})();
