// Sincronización desde la página (HU21). El Service Worker hace lo mismo en segundo plano;
// esta versión cubre navegadores sin Background Sync y el botón "Sincronizar ahora".
// El servidor es idempotente (uuidLocal), así que correr ambas a la vez no duplica registros.
import api from '../api/axios';
import {
  actualizarRegistro,
  guardarMeta,
  listarRegistros,
} from './almacen';

export const TAG_SYNC = 'sincronizar-interconsultas';
export const EVENTO_SYNC = 'sincronizacion-completada';

let enCurso = null;

// Deja token y URL de la API disponibles para el Service Worker
export const publicarSesionParaSW = async () => {
  const token = localStorage.getItem('token');
  if (token) await guardarMeta('token', token);
  await guardarMeta('apiUrl', api.defaults.baseURL);
};

export const hayConexion = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

// ¿El error es de red (no llegó respuesta del servidor)?
export const esErrorDeRed = (err) => Boolean(err) && !err.response;

export const sincronizarPendientes = () => {
  if (enCurso) return enCurso;
  enCurso = (async () => {
    const registros = (await listarRegistros()).filter((r) => r.estado !== 'sincronizado');
    if (registros.length === 0) return { sincronizados: 0, fallidos: 0, total: 0 };

    let respuesta;
    try {
      respuesta = await api.post('/sincronizar', { registros: registros.map((r) => r.payload) });
    } catch (err) {
      // sin red o sesión vencida: se conservan como pendientes para reintentar
      if (err?.response?.status === 401) {
        return { sincronizados: 0, fallidos: 0, total: registros.length, sesionExpirada: true };
      }
      if (esErrorDeRed(err)) {
        return { sincronizados: 0, fallidos: 0, total: registros.length, sinConexion: true };
      }
      const detalle = typeof err.response?.data?.detail === 'string'
        ? err.response.data.detail
        : 'El servidor rechazó el envío';
      for (const r of registros) await actualizarRegistro(r.uuidLocal, { estado: 'error', detalle });
      return { sincronizados: 0, fallidos: registros.length, total: registros.length };
    }

    for (const res of respuesta.data.resultados || []) {
      if (res.estado === 'sincronizado') {
        await actualizarRegistro(res.uuidLocal, {
          estado: 'sincronizado',
          idFormulario: res.idFormulario,
          detalle: '',
        });
      } else {
        await actualizarRegistro(res.uuidLocal, { estado: 'error', detalle: res.detalle || 'Error' });
      }
    }
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_SYNC));
    return {
      sincronizados: respuesta.data.sincronizados,
      fallidos: respuesta.data.fallidos,
      total: registros.length,
    };
  })().finally(() => {
    enCurso = null;
  });
  return enCurso;
};

// Pide la sincronización al Service Worker; si no hay, la hace la página.
export const solicitarSincronizacion = async () => {
  try {
    await publicarSesionParaSW();
    if ('serviceWorker' in navigator) {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((resolve) => setTimeout(() => resolve(null), 1500)),
      ]);
      if (reg?.active) {
        if (reg.sync) await reg.sync.register(TAG_SYNC);
        reg.active.postMessage({ tipo: 'SINCRONIZAR' });
        return { delegada: true };
      }
    }
  } catch (err) {
    console.warn('[sync] No se pudo delegar al Service Worker:', err);
  }
  return { delegada: false, ...(await sincronizarPendientes()) };
};
