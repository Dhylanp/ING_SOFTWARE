import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Interconsultas from './pages/Interconsultas';
import ListadoInterconsultas from './pages/ListadoInterconsultas';
import RegistrarInterconsulta from './pages/RegistrarInterconsulta';

function App() {
  // Estado para simular si el usuario inició sesión o no
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route 
          path="/login" 
          element={!isLoggedIn ? <Login onLogin={() => setIsLoggedIn(true)} /> : <Navigate to="/interconsultas" />}   
        />
        <Route
          path="/SignUp"
          element={<SignUp />}
        />
        {/* Rutas Privadas */}
        <Route 
          path="/interconsultas" 
          element={isLoggedIn ? <Interconsultas /> : <Navigate to="/interconsultas" />} 
        />
        {/* rutas de listado y registro, gabriel tu las acomodas*/}
        <Route path="/interconsultas/listado" element={<ListadoInterconsultas />} />
        <Route path="/interconsultas/registrar" element={<RegistrarInterconsulta />} />
        {/*---------------------------------------------------------------------------*/}

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to={isLoggedIn ? "/interconsultas" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;