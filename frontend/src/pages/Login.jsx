import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingOverlay from '../components/LoadingOverlay';

const Login = ({ onLogin }) => {
    const navigate = useNavigate();
    const [idRol, setIdRol] = useState(null);
    const [rut, setRut] = useState('');
    const [clave, setClave] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const getNombreRol = (rol) => {
        switch (rol) {
            case 1: return 'Administrador CESFAM';
            case 2: return 'Administrador Externo';
            case 3: return 'Paciente';
            default: return '';
        }
    };

    const handleRutChange = (e) => {
        const valor = e.target.value.replace(/\D/g, '');
        setRut(valor);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        setError('');
        setLoading(true);

        const payload = {
            rut: Number(rut),
            clave: clave,
            rol: idRol
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch(
                'https://ingsoftware-production-4899.up.railway.app/login',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                }
            );

            clearTimeout(timeoutId);

            const text = await response.text();
            let data = null;

            try {
                data = text ? JSON.parse(text) : null;
            } catch {
                setError(`Error del servidor (status ${response.status})`);
                return;
            }

            if (!response.ok) {
                let mensaje = `Error ${response.status}`;

                if (data) {
                    if (typeof data.detail === 'string') {
                        mensaje = data.detail;
                    } else if (Array.isArray(data.detail)) {
                        // Errores de validación de FastAPI
                        mensaje = data.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
                    } else if (typeof data === 'string') {
                        mensaje = data;
                    }
                }

                setError(mensaje);
                return;
            }

            // Guardar token y usuario
            if (data?.access_token) {
                localStorage.setItem('token', data.access_token);
            }
            if (data?.usuario) {
                localStorage.setItem('usuario', JSON.stringify(data.usuario));
            }

            if (onLogin) onLogin();
            navigate('/interconsultas');

        } catch (err) {
            clearTimeout(timeoutId);

            if (err.name === 'AbortError') {
                setError('El servidor tardó demasiado. Intente de nuevo.');
            } else {
                setError('No se pudo conectar con el servidor');
            }
        } finally {
            setLoading(false);
        }
    };

    const volverARoles = () => {
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p>Seleccione su tipo de usuario:</p>

                    <button type="button" onClick={() => setIdRol(3)}>Paciente</button>
                    <button type="button" onClick={() => setIdRol(2)}>Administrador Externo</button>
                    <button type="button" onClick={() => setIdRol(1)}>Administrador CESFAM</button>

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
                        style={{ marginBottom: '15px', fontSize: '12px' }}
                    >
                        ← Volver a roles
                    </button>

                    <p>
                        Ingresando como:{' '}
                        <strong>{getNombreRol(idRol)}</strong>
                    </p>

                    <form
                        onSubmit={handleSubmit}
                        style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
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

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                marginTop: '10px',
                                padding: '10px',
                                backgroundColor: loading ? '#999' : '#0056b3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Ingresando...' : 'Ingresar'}
                        </button>
                    </form>

                    {error && (
                        <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default Login;