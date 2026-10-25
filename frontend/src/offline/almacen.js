// Almacenamiento local en IndexedDB (HU19). Lo comparten la página y el Service Worker
// (public/sw.js usa el MISMO nombre de base y de stores: si se cambia aquí, cambiarlo allá).
//
//  store "pendientes": una fila por interconsulta registrada sin conexión
//     { uuidLocal, payload, nombrePaciente, estado, creado, idFormulario?, detalle? }
//     estado: 'pendiente' | 'sincronizado' | 'error'
//  store "meta": { clave, valor }  (token de sesión y URL de la API para el Service Worker)

export const DB_NOMBRE = 'interconsultas-offline';
export const DB_VERSION = 1;
export const EVENTO_CAMBIOS = 'pendientes-actualizados';

const abrir = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOMBRE, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('pendientes')) {
        db.createObjectStore('pendientes', { keyPath: 'uuidLocal' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'clave' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const transaccion = async (store, modo, operacion) => {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, modo);
    const resultado = operacion(tx.objectStore(store));
    tx.oncomplete = () => {
      db.close();
      resolve(resultado?.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
};

const avisarCambio = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_CAMBIOS));
};

export const nuevoUuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

export const guardarPendiente = async ({ payload, nombrePaciente }) => {
  const registro = {
    uuidLocal: nuevoUuid(),
    payload,
    nombrePaciente: nombrePaciente || '',
    estado: 'pendiente',
    creado: new Date().toISOString(),
  };
  registro.payload = { ...payload, uuidLocal: registro.uuidLocal };
  await transaccion('pendientes', 'readwrite', (s) => s.put(registro));
  avisarCambio();
  return registro;
};

export const listarRegistros = async () => {
  const todos = (await transaccion('pendientes', 'readonly', (s) => s.getAll())) || [];
  return todos.sort((a, b) => String(b.creado).localeCompare(String(a.creado)));
};

export const actualizarRegistro = async (uuidLocal, cambios) => {
  const db = await abrir();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('pendientes', 'readwrite');
    const store = tx.objectStore('pendientes');
    const lectura = store.get(uuidLocal);
    lectura.onsuccess = () => {
      if (lectura.result) store.put({ ...lectura.result, ...cambios });
    };
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
  avisarCambio();
};

export const eliminarSincronizados = async () => {
  const todos = await listarRegistros();
  const db = await abrir();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('pendientes', 'readwrite');
    const store = tx.objectStore('pendientes');
    todos.filter((r) => r.estado === 'sincronizado').forEach((r) => store.delete(r.uuidLocal));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  avisarCambio();
};

export const guardarMeta = (clave, valor) =>
  transaccion('meta', 'readwrite', (s) => s.put({ clave, valor }));

export const leerMeta = async (clave) => {
  const fila = await transaccion('meta', 'readonly', (s) => s.get(clave));
  return fila?.valor ?? null;
};

export const borrarMeta = (clave) => transaccion('meta', 'readwrite', (s) => s.delete(clave));
