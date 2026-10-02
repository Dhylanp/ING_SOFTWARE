import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(() => {
    const usuarioGuardado =
      localStorage.getItem('usuario');

    if (!usuarioGuardado) {
      return null;
    }

    try {
      return JSON.parse(usuarioGuardado);
    } catch (error) {
      console.error(
        'Error al leer usuario:',
        error
      );

      localStorage.removeItem('usuario');

      return null;
    }
  });

  const isLoggedIn = usuario !== null;


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


  useEffect(() => {
    const usuarioGuardado =
      localStorage.getItem('usuario');

    if (!usuarioGuardado) {
      setUsuario(null);
      return;
    }

    try {
      const datos =
        JSON.parse(usuarioGuardado);

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
        login,
        logout,
        tieneRol
      }}
    >
      {children}
    </AuthContext.Provider>
  );
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