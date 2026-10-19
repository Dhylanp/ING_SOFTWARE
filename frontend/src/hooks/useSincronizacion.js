import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listarRegistros } from '../offline/almacen';
import {
  EVENTO_SYNC,
  publicarSesionParaSW,
  solicitarSincronizacion,
} from '../offline/sync';

// Se monta una sola vez (en App): deja la sesión disponible para el Service Worker,
// dispara la sincronización al volver la conexión y reenvía los avisos del SW a la pantalla.
export default function useSincronizacion() {
  const { isLoggedIn, tieneRol } = useAuth();
  const esAdministrativo = isLoggedIn && tieneRol(1);

  useEffect(() => {
    if (!esAdministrativo) return undefined;

    const intentar = async () => {
      try {
        if ((await listarRegistros()).some((r) => r.estado === 'pendiente')) {
          await solicitarSincronizacion();
        }
      } catch (err) {
        console.warn('[sync] No se pudo iniciar la sincronización:', err);
      }
    };

    publicarSesionParaSW().catch(() => {});
    if (navigator.onLine !== false) intentar();

    window.addEventListener('online', intentar);

    const alMensajeSW = (e) => {
      if (e.data?.tipo === 'SINCRONIZACION') {
        window.dispatchEvent(new Event(EVENTO_SYNC));
        window.dispatchEvent(new Event('pendientes-actualizados'));
      }
    };
    navigator.serviceWorker?.addEventListener('message', alMensajeSW);

    return () => {
      window.removeEventListener('online', intentar);
      navigator.serviceWorker?.removeEventListener('message', alMensajeSW);
    };
  }, [esAdministrativo]);
}
