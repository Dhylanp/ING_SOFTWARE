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

    return (
        <BrowserRouter>
            {/* El widget se monta una sola vez si hay sesión */}
            {isLoggedIn && <UserWidget />}

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
                        path="/interconsultas/listado"
                        element={<ListadoInterconsultas />}
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