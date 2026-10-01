import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_URL = 'https://ingsoftware-production-4899.up.railway.app';

// Helpers para localStorage
const leerSesion = () => {
  try {
    const raw = localStorage.getItem('sesion');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  // sesion = {
  //   idPersona, rut, nombrePersona, idComuna,
  //   rolActual: 1 | 2 | 3 | 4,
  //   accesos: [ { idRol, idCentro, nombreCentro, tipoCentro, activo }, ... ]
  // }
  const [sesion, setSesion] = useState(() => leerSesion());

  // Persistir en localStorage
  useEffect(() => {
    if (sesion) {
      localStorage.setItem('sesion', JSON.stringify(sesion));
      // Compatibilidad con lógica antigua (isLoggedIn en App)
      localStorage.setItem('token', 'sesion-activa');
    } else {
      localStorage.removeItem('sesion');
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
    }
  }, [sesion]);

  const iniciarSesion = async ({ rut, clave, rol }) => {
    // 1) Login
    const loginRes = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rut: Number(rut), clave, rol })
    });

    const text = await loginRes.text();
    let loginData = null;
    try {
      loginData = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`Error del servidor (status ${loginRes.status})`);
    }

    if (!loginRes.ok) {
      const msg =
        typeof loginData?.detail === 'string'
          ? loginData.detail
          : Array.isArray(loginData?.detail)
            ? loginData.detail.map((d) => d.msg || JSON.stringify(d)).join(', ')
            : `Error ${loginRes.status}`;
      throw new Error(msg);
    }

    // loginData es un array con el registro
    const persona = Array.isArray(loginData) ? loginData[0] : loginData;
    if (!persona) throw new Error('Respuesta inválida del servidor');

    const idPersona = persona.idPersona;
    if (!idPersona) {
      throw new Error(
        'El servidor no devolvió idPersona. Revisa el SELECT del /login en main.py'
      );
    }

    // 2) Traer TODOS los accesos activos del usuario
    let accesos = [];
    try {
      const accRes = await fetch(`${API_URL}/Acceso/0/${idPersona}/0/0`);
      if (accRes.ok) {
        const accData = await accRes.json();
        accesos = Array.isArray(accData) ? accData : [];
      }
    } catch (err) {
      console.warn('[Auth] No se pudieron cargar todos los accesos:', err);
    }

    // Normalizar
    const accesosNormalizados = accesos
      .filter((a) => a.activo === 'S')
      .map((a) => {
        const esRolGestion = a.idRol === 4;
        const esPaciente = a.idRol === 3;

        let idCentro = a.idCentro;
        let nombreCentro = a.nombreCentro;
        let tipoCentro = a.tipoCentro;

        if (esPaciente || esRolGestion) {
          idCentro = 'x';
          nombreCentro = 'x';
          tipoCentro = 'x';
        }

        return {
          idRol: a.idRol,
          idCentro,
          nombreCentro,
          tipoCentro,
          activo: a.activo
        };
      });

    // 3) Armar sesión
    const nuevaSesion = {
      idPersona,
      rut: persona.rut,
      nombrePersona: persona.nombrePersona,
      idComuna: persona.idComuna,
      rolActual: rol,
      accesos: accesosNormalizados
    };

    setSesion(nuevaSesion);
    return nuevaSesion;
  };

  const cerrarSesion = () => {
    setSesion(null);
  };

  const tieneRol = (idRol) =>
    !!sesion?.accesos?.some((a) => a.idRol === idRol);

  const getAcceso = (idRol) =>
    sesion?.accesos?.find((a) => a.idRol === idRol) || null;

  return (
    <AuthContext.Provider
      value={{
        sesion,
        iniciarSesion,
        cerrarSesion,
        tieneRol,
        getAcceso,
        isLoggedIn: !!sesion
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};

// Helper global para los nombres de rol (basado en tu tabla 'rol')
export const getNombreRol = (idRol) => {
  switch (idRol) {
    case 1: return 'Admin';
    case 2: return 'Externo';
    case 3: return 'Usuario';
    case 4: return 'Gestionador de Roles';
    default: return `Rol ${idRol}`;
  }
};

export const getDescripcionRol = (idRol) => {
  switch (idRol) {
    case 1: return 'Administra Cesfam y envía Formularios';
    case 2: return 'Administra Hospital y reenvía Formularios';
    case 3: return 'Visualiza y administra sus datos y Formularios';
    case 4: return 'Acceso a la pantalla de Gestionar Roles';
    default: return '';
  }
};