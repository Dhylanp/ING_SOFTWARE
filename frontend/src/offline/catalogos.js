// Cache de listas de apoyo (pacientes, hospitales, especialidades) para poder
// registrar una interconsulta sin conexión (HU19). Es solo lectura y se borra al cerrar sesión.
import api from '../api/axios';

const PREFIJO = 'cat:';

const leer = (url) => {
  try {
    const crudo = localStorage.getItem(PREFIJO + url);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
};

const escribir = (url, datos) => {
  try {
    localStorage.setItem(PREFIJO + url, JSON.stringify(datos));
  } catch {
    /* cuota llena o almacenamiento bloqueado: se sigue sin cache */
  }
};

// Por confidencialidad del paciente solo se guarda lo mínimo para buscarlo por RUT.
const minimizar = (url, datos) => {
  if (url === '/persona' && Array.isArray(datos)) {
    return datos.map(({ idPersona, rut, dv, nombrePersona }) => ({ idPersona, rut, dv, nombrePersona }));
  }
  return datos;
};

// GET con respaldo: si no hay red devuelve la última copia guardada.
export const getConCache = async (url) => {
  try {
    const respuesta = await api.get(url);
    escribir(url, minimizar(url, respuesta.data));
    return { data: respuesta.data, desdeCache: false };
  } catch (err) {
    if (!err.response) {
      const copia = leer(url);
      if (copia) return { data: copia, desdeCache: true };
    }
    throw err;
  }
};

export const limpiarCatalogos = () => {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIJO))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* nada que limpiar */
  }
};
