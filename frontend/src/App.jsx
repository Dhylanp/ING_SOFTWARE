import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Interconsultas from './pages/Interconsultas';

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

        {/* Rutas Privadas */}
        <Route 
          path="/interconsultas" 
          element={isLoggedIn ? <Interconsultas /> : <Navigate to="/login" />} 
        />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to={isLoggedIn ? "/interconsultas" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;