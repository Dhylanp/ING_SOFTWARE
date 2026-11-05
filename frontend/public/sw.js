/* Service Worker (HU19 / HU21)
 *  1) Deja la aplicación disponible sin conexión (app shell en caché).
 *  2) Cuando vuelve internet envía a la API los registros guardados en IndexedDB y
 *     avisa a la pantalla para que cambie el distintivo a "sincronizado".
 * La base IndexedDB debe coincidir con src/offline/almacen.js.
 */
const CACHE = 'interconsultas-shell-v1';
const SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest'];
const DB_NOMBRE = 'interconsultas-offline';
const TAG_SYNC = 'sincronizar-interconsultas';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // la API no se cachea aquí

  // Navegación: red primero; sin red, el index (la app es una SPA)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copia));
          return resp;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Archivos estáticos: caché primero, y se actualizan en segundo plano
  event.respondWith(
    caches.match(req).then((enCache) => {
      const red = fetch(req)
        .then((resp) => {
          if (resp.ok) {
            const copia = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return resp;
        })
        .catch(() => enCache);
      return enCache || red;
    })
  );
});

// ---------- IndexedDB (mismo esquema que la página) ----------
function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOMBRE, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('pendientes')) db.createObjectStore('pendientes', { keyPath: 'uuidLocal' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'clave' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function pedir(db, store, modo, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, modo);
    const r = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(r && r.result);
    tx.onerror = () => reject(tx.error);
  });
}

let sincronizando = null;

function sincronizar() {
  if (sincronizando) return sincronizando;
  sincronizando = (async () => {
    const db = await abrirDB();
    try {
      const todos = (await pedir(db, 'pendientes', 'readonly', (s) => s.getAll())) || [];
      const pendientes = todos.filter((r) => r.estado !== 'sincronizado');
      if (pendientes.length === 0) return;

      const token = (await pedir(db, 'meta', 'readonly', (s) => s.get('token')))?.valor;
      const apiUrl = (await pedir(db, 'meta', 'readonly', (s) => s.get('apiUrl')))?.valor;
      if (!token || !apiUrl) return; // sin sesión: se enviará cuando la persona ingrese

      // si no hay red, fetch lanza y Background Sync reintentará más tarde
      const resp = await fetch(apiUrl + '/sincronizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ registros: pendientes.map((r) => r.payload) }),
      });

      if (resp.status === 401) {
        await avisar({ tipo: 'SINCRONIZACION', sesionExpirada: true });
        return;
      }
      if (!resp.ok) throw new Error('HTTP ' + resp.status);

      const cuerpo = await resp.json();
      const porUuid = {};
      pendientes.forEach((r) => (porUuid[r.uuidLocal] = r));
      await new Promise((resolve, reject) => {
        const tx = db.transaction('pendientes', 'readwrite');
        const store = tx.objectStore('pendientes');
        (cuerpo.resultados || []).forEach((res) => {
          const original = porUuid[res.uuidLocal];
          if (!original) return;
          store.put(
            res.estado === 'sincronizado'
              ? { ...original, estado: 'sincronizado', idFormulario: res.idFormulario, detalle: '' }
              : { ...original, estado: 'error', detalle: res.detalle || 'Error' }
          );
        });
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      await avisar({ tipo: 'SINCRONIZACION', sincronizados: cuerpo.sincronizados, fallidos: cuerpo.fallidos });
    } finally {
      db.close();
    }
  })().finally(() => {
    sincronizando = null;
  });
  return sincronizando;
}

async function avisar(mensaje) {
  const ventanas = await self.clients.matchAll({ includeUncontrolled: true });
  ventanas.forEach((v) => v.postMessage(mensaje));
}

self.addEventListener('sync', (event) => {
  if (event.tag === TAG_SYNC) event.waitUntil(sincronizar());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.tipo === 'SINCRONIZAR') event.waitUntil(sincronizar().catch(() => {}));
});
