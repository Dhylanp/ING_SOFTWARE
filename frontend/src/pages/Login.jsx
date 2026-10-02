import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingOverlay from '../components/LoadingOverlay';
import { useAuth, getNombreRol, getDescripcionRol } from '../context/AuthContext';

const Login = () => {
    const navigate = useNavigate();
    const { iniciarSesion } = useAuth();

    const [idRol, setIdRol] = useState(null);
    const [rut, setRut] = useState('');
    const [clave, setClave] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRutChange = (e) => {
        const valor = e.target.value.replace(/\D/g, '');
        setRut(valor);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        setError('');

        if (!idRol) {
            setError('Debe seleccionar un tipo de usuario');
            return;
        }

        if (!rut || !clave) {
            setError('Debe ingresar RUT y clave');
            return;
        }

        setLoading(true);

        try {
            await iniciarSesion({
                rut: Number(rut),
                clave,
                rol: Number(idRol)
            });

            // Redirige a /interconsultas (no a /listado)
            navigate('/interconsultas', { replace: true });
        } catch (err) {
            setError(err.message || 'No se pudo iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    const volverARoles = () => {
        if (loading) return;

        setIdRol(null);
        setError('');
        setRut('');
        setClave('');
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
            <LoadingOverlay visible={loading} texto="Ingresando..." />

            <h2>Iniciar Sesión</h2>

            {idRol === null ? (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}
                >
                    <p>Seleccione su tipo de usuario:</p>

                    <BotonRol
                        onClick={() => setIdRol(3)}
                        idRol={3}
                    />

                    <BotonRol
                        onClick={() => setIdRol(2)}
                        idRol={2}
                    />

                    <BotonRol
                        onClick={() => setIdRol(1)}
                        idRol={1}
                    />

                    <BotonRol
                        onClick={() => setIdRol(4)}
                        idRol={4}
                    />

                    <p
                        onClick={() => navigate('/signup')}
                        style={{
                            color: '#0066cc',
                            cursor: 'pointer',
                            textAlign: 'center',
                            marginTop: '15px'
                        }}
                    >
                        ¿Desea crear Usuario como Paciente?
                    </p>
                </div>
            ) : (
                <div
                    style={{
                        border: '1px solid #ccc',
                        padding: '20px',
                        borderRadius: '8px',
                        marginTop: '15px'
                    }}
                >
                    <button
                        type="button"
                        onClick={volverARoles}
                        disabled={loading}
                        style={{
                            marginBottom: '15px',
                            fontSize: '12px'
                        }}
                    >
                        ← Volver a roles
                    </button>

                    <p>
                        Ingresando como:{' '}
                        <strong>{getNombreRol(idRol)}</strong>
                    </p>

                    <p
                        style={{
                            fontSize: '12px',
                            color: '#666',
                            marginTop: '-8px'
                        }}
                    >
                        {getDescripcionRol(idRol)}
                    </p>

                    <form
                        onSubmit={handleSubmit}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}
                    >
                        <label>
                            <p>RUT (Sin Dígito Verificador)</p>

                            <input
                                type="text"
                                inputMode="numeric"
                                value={rut}
                                onChange={handleRutChange}
                                required
                                disabled={loading}
                                placeholder="Ej: 12345678"
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </label>

                        <label>
                            <p>CLAVE</p>

                            <input
                                type="password"
                                value={clave}
                                onChange={(e) => setClave(e.target.value)}
                                required
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </label>

                        {error && (
                            <p
                                style={{
                                    color: 'red',
                                    margin: '5px 0'
                                }}
                            >
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                marginTop: '10px',
                                padding: '10px',
                                backgroundColor: loading
                                    ? '#999'
                                    : '#0056b3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                cursor: loading
                                    ? 'not-allowed'
                                    : 'pointer'
                            }}
                        >
                            {loading ? 'Ingresando...' : 'Ingresar'}
                        </button>

                        <p
                            onClick={() => {
                                if (!loading) {
                                    navigate('/signup');
                                }
                            }}
                            style={{
                                color: '#0066cc',
                                cursor: loading
                                    ? 'not-allowed'
                                    : 'pointer',
                                textAlign: 'center',
                                marginTop: '10px',
                                marginBottom: 0,
                                fontSize: '14px'
                            }}
                        >
                            Registrarse
                        </p>
                    </form>
                </div>
            )}
        </div>
    );
};

const BotonRol = ({ onClick, idRol }) => (
    <button
        type="button"
        onClick={onClick}
        style={{
            padding: '10px',
            backgroundColor: '#f7f9fc',
            border: '1px solid #c7daf5',
            borderRadius: '6px',
            cursor: 'pointer',
            textAlign: 'left'
        }}
    >
        <div
            style={{
                fontWeight: 'bold',
                color: '#0056b3'
            }}
        >
            {getNombreRol(idRol)}
        </div>

        <div
            style={{
                fontSize: '12px',
                color: '#666',
                marginTop: '2px'
            }}
        >
            {getDescripcionRol(idRol)}
        </div>
    </button>
);

export default Login;