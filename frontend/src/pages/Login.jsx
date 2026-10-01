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
                'https://21jfmx87-8000.brs.devtunnels.ms/login',
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
                const mensaje =
                    (data && data.detail) ||
                    (typeof data === 'string' ? data : null) ||
                    `Error ${response.status}`;
                setError(mensaje);
                return;
            }

            if (data.access_token) {
                localStorage.setItem('token', data.access_token);
            }
            if (data.usuario) {
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

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
            <LoadingOverlay visible={loading} texto="Ingresando..." />

            <h2>Iniciar Sesión</h2>

            {idRol === null ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p>Seleccione su tipo de usuario:</p>

                    <button onClick={() => setIdRol(3)}>Paciente</button>
                    <button onClick={() => setIdRol(2)}>Administrador Externo</button>
                    <button onClick={() => setIdRol(1)}>Administrador CESFAM</button>

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
                        onClick={() => {
                            setIdRol(null);
                            setError('');
                        }}
                        style={{ marginBottom: '15px', fontSize: '12px' }}
                    >
                        ← Volver a roles
                    </button>

                    <p>
                        Ingresando como:{' '}
                        <strong>
                            {idRol === 3 && 'Paciente'}
                            {idRol === 2 && 'Administrador Externo'}
                            {idRol === 1 && 'Administrador CESFAM'}
                        </strong>
                    </p>

                    <form
                        onSubmit={handleSubmit}
                        style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                    >
                        <label>
                            <p>RUT (Sin Dígito Verificador)</p>
                            <input
                                type="text"
                                value={rut}
                                onChange={(e) => setRut(e.target.value)}
                                required
                                disabled={loading}
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