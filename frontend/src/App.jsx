import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';

// Importar páginas desde ./pages/
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Interconsultas from './pages/Interconsultas';
import ListadoInterconsultas from './pages/ListadoInterconsultas';
import RegistrarInterconsulta from './pages/RegistrarInterconsulta';
import GestorRoles from './pages/GestorRoles';

// Componentes de protección definidos fuera de App para evitar rerenders innecesarios
const RutaPrivada = ({ children, isLoggedIn }) => {
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

const RutaPublica = ({ children, isLoggedIn }) => {
  return !isLoggedIn ? children : <Navigate to="/interconsultas" replace />;
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem('token')
  );

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
            <RutaPublica isLoggedIn={isLoggedIn}>
              <Login onLogin={handleLogin} />
            </RutaPublica>
          }
        />

        <Route
          path="/signup"
          element={
            <RutaPublica isLoggedIn={isLoggedIn}>
              <SignUp />
            </RutaPublica>
          }
        />

        {/* Rutas Privadas */}
        <Route
          path="/interconsultas"
          element={
            <RutaPrivada isLoggedIn={isLoggedIn}>
              <Interconsultas />
            </RutaPrivada>
          }
        />

        <Route
          path="/GestorRoles"
          element={
            <RutaPrivada isLoggedIn={isLoggedIn}>
              <GestorRoles />
            </RutaPrivada>
          }
        />

        <Route
          path="/interconsultas/listado"
          element={
            <RutaPrivada isLoggedIn={isLoggedIn}>
              <ListadoInterconsultas />
            </RutaPrivada>
          }
        />

        <Route
          path="/interconsultas/registrar"
          element={
            <RutaPrivada isLoggedIn={isLoggedIn}>
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