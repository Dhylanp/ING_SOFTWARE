import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import LoadingOverlay from '../components/LoadingOverlay';
import { useAuth, getNombreRol, getDescripcionRol } from '../context/AuthContext';


const Login = () => {
    const navigate = useNavigate();
    const { iniciarSesion } = useAuth();

    const [idRol, setIdRol] = useState(null);
    const [rut, setRut] = useState('');
    const [clave, setClave] = useState('');
    const [loading, setLoading] = useState(false);
    const [mostrarClave, setMostrarClave] = useState(false);

    const handleRutChange = (e) => {
        const valor = e.target.value.replace(/\D/g, '');
        setRut(valor);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        if (!idRol) {
            Swal.fire({
                icon: 'warning',
                title: 'Falta el tipo de usuario',
                text: 'Debe seleccionar un tipo de usuario.'
            });
            return;
        }

        if (!rut || !clave) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Debe ingresar RUT y clave.'
            });
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
            Swal.fire({
                icon: 'error',
                title: 'No se pudo iniciar sesión',
                text: err.message || 'Ocurrió un error al iniciar sesión.'
            });
        } finally {
            setLoading(false);
        }
    };

    const volverARoles = () => {
        if (loading) return;

        setIdRol(null);
        setRut('');
        setClave('');
    };

    return (
        <div style={{ padding: '20px', width: '100%', maxWidth: '400px', margin: '0 auto', boxSizing: 'border-box' }}>
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
                            color: 'var(--primary)',
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
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--surface)',
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
                            color: 'var(--text-muted)',
                            marginTop: '-8px'
                        }}
                    >
                        {getDescripcionRol(idRol)}
                    </p>

                    <form
                        onSubmit={handleSubmit}
                        noValidate
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
                                style={{ width: '100%' }}
                            />
                        </label>

                        <label>
                            <p>CLAVE</p>

                            <div style={{ position: 'relative' }}>
                                <input
                                    type={mostrarClave ? 'text' : 'password'}
                                    value={clave}
                                    onChange={(e) => setClave(e.target.value)}
                                    placeholder="Contraseña"
                                    style={{
                                        width: '100%',
                                        paddingRight: '45px'
                                    }}
                                />

                                <button
                                    type="button"
                                    onClick={() => setMostrarClave(!mostrarClave)}
                                    style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                >
                                    {mostrarClave ? (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M3 3l18 18" />
                                            <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                                            <path d="M9.88 4.24A9.7 9.7 0 0 1 12 4c5 0 9.27 3.11 11 8a17.8 17.8 0 0 1-2.16 3.19" />
                                            <path d="M6.61 6.61C4.62 7.91 3.05 9.73 2 12c1.73 4.89 6 8 10 8a9.7 9.7 0 0 0 2.12-.24" />
                                        </svg>
                                    ) : (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </label>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                marginTop: '10px',
                                padding: '10px',
                                fontWeight: 'bold'
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
                                color: 'var(--primary)',
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
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px',
            backgroundColor: 'var(--surface-alt)',
            color: 'var(--text-h)',
            border: '1px solid var(--primary-soft-border)',
            borderRadius: '6px',
            cursor: 'pointer',
            textAlign: 'left'
        }}
    >
        <div style={{ fontWeight: 'bold' }}>
            {getNombreRol(idRol)}
        </div>

        <div
            style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginTop: '2px'
            }}
        >
            {getDescripcionRol(idRol)}
        </div>
    </button>
);

export default Login;