import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';


const Login = () => {
    const navigate = useNavigate();
    const [idRol, setIdRol] = useState(null);
    const [rut, setRut] = useState('');
    const [clave, setClave] = useState('');
    const [respuesta, setRespuesta] = useState(null);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError('');
        setRespuesta(null);

        const payload = {
            rut: Number(rut),
            clave: clave,
            rol: idRol
        };

        console.log("Enviando a la API:", payload);

        try {
            const response = await fetch(
                'https://21jfmx87-8000.brs.devtunnels.ms/login',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }
            );

            const data = await response.json();

            if (!response.ok) {
            setError(data.detail || 'Error al iniciar sesión');
            return;
            }

            localStorage.setItem('usuario', JSON.stringify(data[0]));

            navigate('/interconsultas');

        } catch (error) {
            console.error("Error conectando con la API:", error);
            setError('No se pudo conectar con el servidor');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
            <h2>Iniciar Sesión</h2>

            {idRol === null ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p>Seleccione su tipo de usuario:</p>

                    <button onClick={() => setIdRol(3)}>
                        Paciente
                    </button>

                    <button onClick={() => setIdRol(2)}>
                        Administrador Externo
                    </button>

                    <button onClick={() => setIdRol(1)}>
                        Administrador CESFAM
                    </button>
                    <p
                    onClick={() => navigate('/SignUp')}
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
                            setRespuesta(null);
                        }}
                        style={{
                            marginBottom: '15px',
                            fontSize: '12px'
                        }}
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
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}
                    >
                        <label>
                            <p>RUT (Sin Digito Verificador)</p>

                            <input
                                type="text"
                                value={rut}
                                onChange={(e) => setRut(e.target.value)}
                                required
                            />
                        </label>

                        <label>
                            <p>CLAVE</p>

                            <input
                                type="password"
                                value={clave}
                                onChange={(e) => setClave(e.target.value)}
                                required
                            />
                        </label>
                        <p
                        onClick={() => navigate('/SignUp')}
                        style={{
                            color: '#0066cc',
                            cursor: 'pointer',
                            textAlign: 'center',
                            marginTop: '15px'
                        }}
                        >
                        ¿Desea crear un usuario como Paciente?
                        </p>

                        <button
                            type="submit"
                            style={{ marginTop: '10px' }}
                        >
                            Ingresar
                        </button>
                    </form>

                    {error && (
                        <p style={{ color: 'red' }}>
                            {error}
                        </p>
                    )}

                    {respuesta && (
                        <div style={{ marginTop: '20px' }}>
                            <h3>Login exitoso</h3>

                            <p>
                                Nombre: {respuesta[0].nombrePersona}
                            </p>

                            <p>
                                RUT: {respuesta[0].rut}
                            </p>

                            <p>
                                Comuna: {respuesta[0].idComuna}
                            </p>

                            <p>
                                Hospital: {respuesta[0].idHospital ?? 'No asignado'}
                            </p>

                            <p>
                                CESFAM: {respuesta[0].idCesfam ?? 'No asignado'}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Login;