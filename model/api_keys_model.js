// API Keys model: IndexedDB operations centralized here
(function () {
  'use strict';

  var IDB_DBNAME = 'dsna-meta';
  var IDB_STORE = 'apiKeys';

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(IDB_DBNAME, 1);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          var os = db.createObjectStore(IDB_STORE, { keyPath: 'id', autoIncrement: true });
          try { os.createIndex('name', 'name', { unique: false }); } catch (e) { /* ignore */ }
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
          if (!c) { resolve(items); return; }
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

  // Expose a simple model API
  window.apiKeysModel = {
    openDb: openDb,
    addEntry: addEntry,
    updateEntry: updateEntry,
    setActiveEntry: setActiveEntry,
    listEntries: listEntries,
    deleteEntry: deleteEntry,
    saveAllEntries: saveAllEntries
  };

})();
