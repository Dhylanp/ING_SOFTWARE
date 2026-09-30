import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';

// Importar páginas desde ./pages/
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Interconsultas from './pages/Interconsultas';
import ListadoInterconsultas from './pages/ListadoInterconsultas';
import RegistrarInterconsulta from './pages/RegistrarInterconsulta';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem('token')
  );

  const RutaPrivada = ({ children }) => {
    return isLoggedIn ? children : <Navigate to="/login" replace />;
  };

  const RutaPublica = ({ children }) => {
    return !isLoggedIn ? children : <Navigate to="/interconsultas" replace />;
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route
          path="/login"
          element={
            <RutaPublica>
              <Login onLogin={handleLogin} />
            </RutaPublica>
          }
        />

        <Route
          path="/signup"
          element={
            <RutaPublica>
              <SignUp />
            </RutaPublica>
          }
        />

        {/* Rutas Privadas */}
        <Route
          path="/interconsultas"
          element={
            <RutaPrivada>
              <Interconsultas />
            </RutaPrivada>
          }
        />

        <Route
          path="/interconsultas/listado"
          element={
            <RutaPrivada>
              <ListadoInterconsultas />
            </RutaPrivada>
          }
        />

        <Route
          path="/interconsultas/registrar"
          element={
            <RutaPrivada>
              <RegistrarInterconsulta />
            </RutaPrivada>
          }
        />

        {/* Redirección por defecto */}
        <Route
          path="*"
          element={
            <Navigate
              to={isLoggedIn ? "/interconsultas" : "/login"}
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;