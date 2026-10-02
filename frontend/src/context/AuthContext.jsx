import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';

import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(() => {
    const usuarioGuardado = localStorage.getItem('usuario');

    if (!usuarioGuardado) {
      return null;
    }

    try {
      return JSON.parse(usuarioGuardado);
    } catch (error) {
      console.error('Error al leer usuario:', error);
      localStorage.removeItem('usuario');
      return null;
    }
  });

  const isLoggedIn = usuario !== null;

  const iniciarSesion = async ({ rut, clave, rol }) => {
    try {
      const response = await api.post('/login', {
        rut: Number(rut),
        clave: clave,
        rol: Number(rol)
      });

      const datosUsuario = response.data;

      if (!datosUsuario) {
        throw new Error('El servidor no devolvió información del usuario');
      }

      // ============================================================
      // Transformación de la respuesta del backend.
      //
      // El backend /login devuelve un ARRAY de accesos (una fila por
      // cada acceso activo con ese rol). Lo convertimos a un objeto
      // con la forma que espera el frontend (UserWidget, etc.):
      //   {
      //     idPersona, rut, nombrePersona, idRol,
      //     accesos: [ { idRol, idCesfam, idHospital,
      //                  tipoCentro, nombreCentro, idCentro } ]
      //   }
      // ============================================================
      let usuarioCompleto;

      if (Array.isArray(datosUsuario)) {
        const primero = datosUsuario[0] || {};

        usuarioCompleto = {
          idPersona: primero.idPersona,
          rut: primero.rut,
          nombrePersona: primero.nombrePersona,
          idComuna: primero.idComuna,
          idRol: Number(primero.idRol || rol),

          accesos: datosUsuario.map((a) => {
            const idRol = Number(a.idRol);

            // Rol 3 (Paciente) no tiene centro asociado
            const tipoCentro =
              idRol === 3
                ? 'x'
                : a.idCesfam && a.idCesfam !== 0
                  ? 'Cesfam'
                  : a.idHospital && a.idHospital !== 0
                    ? 'Hospital'
                    : 'x';

            const idCentro =
              tipoCentro === 'Cesfam'
                ? a.idCesfam
                : tipoCentro === 'Hospital'
                  ? a.idHospital
                  : 'x';

            const nombreCentro =
              tipoCentro === 'Cesfam'
                ? a.nombreCesfam || ''
                : tipoCentro === 'Hospital'
                  ? a.nombreHospital || ''
                  : '';

            return {
              idRol,
              idCesfam: a.idCesfam,
              idHospital: a.idHospital,
              tipoCentro,
              nombreCentro,
              idCentro
            };
          })
        };
      } else {
        // Por si el backend en el futuro devuelve un objeto
        usuarioCompleto = {
          ...datosUsuario,
          idRol: Number(datosUsuario.idRol || rol),
          accesos: Array.isArray(datosUsuario.accesos)
            ? datosUsuario.accesos
            : []
        };
      }

      localStorage.setItem(
        'usuario',
        JSON.stringify(usuarioCompleto)
      );

      setUsuario(usuarioCompleto);

      return usuarioCompleto;

    } catch (error) {
      console.error('Error al iniciar sesión:', error);

      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }

      if (error.message) {
        throw new Error(error.message);
      }

      throw new Error('No se pudo iniciar sesión');
    }
  };

  const login = (datosUsuario) => {
    if (!datosUsuario) {
      return;
    }

    localStorage.setItem(
      'usuario',
      JSON.stringify(datosUsuario)
    );

    setUsuario(datosUsuario);
  };

  const logout = () => {
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');

    setUsuario(null);
  };

  const tieneRol = (idRol) => {
    if (!usuario) {
      return false;
    }

    return Number(usuario.idRol) === Number(idRol);
  };

  // Helper: obtiene el acceso para un rol específico
  // (útil para el UserWidget: getAcceso(1), getAcceso(2), etc.)
  const getAcceso = (idRol) => {
    if (!usuario || !Array.isArray(usuario.accesos)) {
      return undefined;
    }

    return usuario.accesos.find(
      (a) => Number(a.idRol) === Number(idRol)
    );
  };

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('usuario');

    if (!usuarioGuardado) {
      setUsuario(null);
      return;
    }

    try {
      const datos = JSON.parse(usuarioGuardado);
      setUsuario(datos);
    } catch (error) {
      console.error(
        'Error al recuperar usuario:',
        error
      );

      localStorage.removeItem('usuario');
      setUsuario(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        isLoggedIn,
        iniciarSesion,
        login,
        logout,
        tieneRol,
        getAcceso
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const getNombreRol = (idRol) => {
  const roles = {
    1: 'Admin',
    2: 'Externo',
    3: 'Paciente',
    4: 'Administrador de Roles'
  };

  return roles[Number(idRol)] || 'Usuario';
};

export const getDescripcionRol = (idRol) => {
  const descripciones = {
    1: 'Administrador',
    2: 'Usuario Externo',
    3: 'Paciente',
    4: 'Administrador de Roles'
  };

  return descripciones[Number(idRol)] || '';
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth debe utilizarse dentro de AuthProvider'
    );
  }

  return context;
};