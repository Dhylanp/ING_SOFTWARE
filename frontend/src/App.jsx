import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Tema from './components/Tema';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Interconsultas from './pages/Interconsultas';
import ListadoInterconsultas from './pages/ListadoInterconsultas';
import RegistrarInterconsulta from './pages/RegistrarInterconsulta';
import GestorRoles from './pages/GestorRoles';
import UserWidget from './components/UserWidget';
import FichaPaciente from './pages/FichaPaciente';
import EditarPerfil from './pages/EditarPerfil';
import DetalleInterconsulta from './pages/DetalleInterconsulta';
import BandejaEspecialista from './pages/BandejaEspecialista';
import InterconsultasDevueltas from './pages/InterconsultasDevueltas';
import EditarInterconsulta from './pages/EditarInterconsulta';
import CentroAlertas from './pages/CentroAlertas';
import EstadoConexion from './components/EstadoConexion';
import useSincronizacion from './hooks/useSincronizacion';

// El UserWidget se monta aparte, a nivel de App, para que no se remonte.
const RutaPrivada = () => {
    const { isLoggedIn } = useAuth();

    if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

const RutaPorRol = ({ idRol, children }) => {
    const { isLoggedIn, tieneRol } = useAuth();

    if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
    }

    if (!tieneRol(idRol)) {
        return <Navigate to="/interconsultas" replace />;
    }

    return children;
};

const RutaPublica = ({ children }) => {
    const { isLoggedIn } = useAuth();

    if (isLoggedIn) {
        return <Navigate to="/interconsultas" replace />;
    }

    return children;
};

const RedirectDefault = () => {
    const { isLoggedIn } = useAuth();

    return (
        <Navigate
            to={isLoggedIn ? '/interconsultas' : '/login'}
            replace
        />
    );
};

// Componente interno que sí puede usar useAuth (está dentro de AuthProvider)
const AppContent = () => {
    const { isLoggedIn } = useAuth();

    // HU21: deja la sesión lista para el Service Worker y sincroniza al volver la conexión
    useSincronizacion();

    return (
        <BrowserRouter>
            {/* El widget se monta una sola vez si hay sesión */}
            {isLoggedIn && <UserWidget />}
            {/* Aviso de "sin conexión" / registros pendientes de sincronizar */}
            {isLoggedIn && <EstadoConexion />}

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
                    <Route
                        path="/interconsultas"
                        element={<Interconsultas />}
                    />

                    <Route
                        path="/EditarPerfil"
                        element={<EditarPerfil />}
                    />

                    <Route
                        path="/interconsultas/listado"
                        element={<ListadoInterconsultas />}
                    />

                    <Route
                        path="/interconsultas/devueltas"
                        element={
                            <RutaPorRol idRol={1}>
                                <InterconsultasDevueltas />
                            </RutaPorRol>
                        }
                    />

                    <Route
                        path="/interconsultas/:id/editar"
                        element={
                            <RutaPorRol idRol={1}>
                                <EditarInterconsulta modo="editar" />
                            </RutaPorRol>
                        }
                    />

                    <Route
                        path="/interconsultas/:id/corregir"
                        element={
                            <RutaPorRol idRol={1}>
                                <EditarInterconsulta modo="corregir" />
                            </RutaPorRol>
                        }
                    />

                    <Route
                        path="/especialista/bandeja"
                        element={
                            <RutaPorRol idRol={2}>
                                <BandejaEspecialista />
                            </RutaPorRol>
                        }
                    />

                    <Route
                        path="/alertas"
                        element={
                            <RutaPorRol idRol={1}>
                                <CentroAlertas />
                            </RutaPorRol>
                        }
                    />

                    <Route
                        path="/interconsultas/:id"
                        element={<DetalleInterconsulta />}
                    />

                    <Route
                        path="/interconsultas/registrar"
                        element={
                            <RutaPorRol idRol={1}>
                                <RegistrarInterconsulta />
                            </RutaPorRol>
                        }
                    />

                    <Route
                        path="/pacientes/ficha"
                        element={
                            <RutaPorRol idRol={1}>
                                <FichaPaciente />
                            </RutaPorRol>
                        }
                    />

                    <Route
                        path="/GestorRoles"
                        element={
                            <RutaPorRol idRol={4}>
                                <GestorRoles />
                            </RutaPorRol>
                        }
                    />
                </Route>

                <Route path="*" element={<RedirectDefault />} />
            </Routes>
        </BrowserRouter>
    );
};

function App() {
    return (
        <AuthProvider>
            <Tema />
            <AppContent />
        </AuthProvider>
    );
}

export default App;