// Ayudas de conexión para el registro sin conexión (HU19).
import api from '../api/axios';
import { guardarMeta } from './almacen';

// Deja token y URL de la API disponibles para el Service Worker
export const publicarSesionParaSW = async () => {
  const token = localStorage.getItem('token');
  if (token) await guardarMeta('token', token);
  await guardarMeta('apiUrl', api.defaults.baseURL);
};

export const hayConexion = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

// ¿El error es de red (no llegó respuesta del servidor)?
export const esErrorDeRed = (err) => Boolean(err) && !err.response;
