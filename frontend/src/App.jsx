import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Interconsultas from './pages/Interconsultas';
import ListadoInterconsultas from './pages/ListadoInterconsultas';
import RegistrarInterconsulta from './pages/RegistrarInterconsulta';
import GestorRoles from './pages/GestorRoles';
import Accesos from './pages/Accesos';                 // 👈 NUEVO
import UserWidget from './components/UserWidget';

const RutaPrivada = () => {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return (
    <>
      <UserWidget />
      <Outlet />
    </>
  );
};

const RutaPorRol = ({ idRol, children }) => {
  const { isLoggedIn, tieneRol } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!tieneRol(idRol)) return <Navigate to="/interconsultas" replace />;
  return children;
};

const RutaPublica = ({ children }) => {
  const { isLoggedIn } = useAuth();
  return !isLoggedIn ? children : <Navigate to="/interconsultas" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <RutaPublica>
                <Login />
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

          <Route element={<RutaPrivada />}>
            <Route path="/interconsultas" element={<Interconsultas />} />
            <Route path="/interconsultas/listado" element={<ListadoInterconsultas />} />
            <Route path="/interconsultas/registrar" element={<RegistrarInterconsulta />} />

            {/* Gestor de Roles: rol 4 */}
            <Route
              path="/GestorRoles"
              element={
                <RutaPorRol idRol={4}>
                  <GestorRoles />
                </RutaPorRol>
              }
            />

            {/* Accesos: solo Admin (1) o Externo (2) */}
            <Route
              path="/accesos"
              element={
                <RutaPorRol idRol={1}>
                  <Accesos />
                </RutaPorRol>
              }
            />
          </Route>

          <Route path="*" element={<RedirectDefault />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

const RedirectDefault = () => {
  const { isLoggedIn } = useAuth();
  return <Navigate to={isLoggedIn ? '/interconsultas' : '/login'} replace />;
};

export default App;