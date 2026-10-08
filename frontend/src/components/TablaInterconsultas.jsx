import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // ajusta la ruta si es distinta

const nombresEstado = {
    1: 'Registrada',
    2: 'En lista de espera',
    3: 'Devuelta',
    4: 'Enviada',
};

const normalizarPrioridad = (valor) => {
    if (valor === null || valor === undefined) return null;
    const v = String(valor).trim().toLowerCase();
    if (v === 'alta' || v === '1') return 'alta';
    if (v === 'media' || v === '2') return 'media';
    if (v === 'baja' || v === '3') return 'baja';
    return null;
};

const nombresPrioridad = {
    alta: 'Alta',
    media: 'Media',
    baja: 'Baja',
};

const estilosPrioridad = {
    alta: { backgroundColor: 'var(--error-bg)', color: 'var(--error-text)' },
    media: { backgroundColor: 'var(--warning-bg)', color: 'var(--warning-text)' },
    baja: { backgroundColor: 'var(--success-bg)', color: 'var(--success-text)' },
};

const estiloEtiqueta = {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 'bold',
};

const estiloCelda = {
    padding: '8px',
    border: '1px solid var(--border)',
    color: 'var(--text)',
};

const estiloEncabezado = {
    ...estiloCelda,
    backgroundColor: 'var(--surface-alt)',
    color: 'var(--text-h)',
};

export default function TablaInterconsultas({ filtros }) {
    const [interconsultas, setInterconsultas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    // 👇 Datos de sesión: si es paciente (rol 3), filtramos por su idPersona
    const { idPersona, idRol } = useAuth();

    const filtrosKey = useMemo(
        () => JSON.stringify({
            estados: [...filtros.estados].sort(),
            prioridad: filtros.prioridad,
            especialidad: filtros.especialidad,
            desde: filtros.desde,
            hasta: filtros.hasta,
            idPersona,
            idRol,
        }),
        [filtros, idPersona, idRol]
    );

    useEffect(() => {
        const obtenerInterconsultas = async () => {
            try {
                setCargando(true);
                setError(null);

                const params = {};
                if (filtros.estados.length > 0) params.estados = filtros.estados.join(',');

                if (filtros.prioridad !== 0) {
                    const map = { 1: 'alta', 2: 'media', 3: 'baja' };
                    const p = map[filtros.prioridad];
                    if (p) params.prioridad = p;
                }

                if (filtros.especialidad) params.especialidad = filtros.especialidad;
                if (filtros.desde) params.desde = filtros.desde;
                if (filtros.hasta) params.hasta = filtros.hasta;

                // 👇 Si es paciente (rol 3), restringir a sus propias interconsultas
                if (Number(idRol) === 3 && idPersona) {
                    params.persona = idPersona;
                }

                const respuesta = await api.get('/formulario/filtrar', { params });
                setInterconsultas(respuesta.data);
            } catch (err) {
                console.error('Error /formulario/filtrar:', {
                    status: err.response?.status,
                    data: err.response?.data,
                    message: err.message,
                    url: err.config?.url,
                    params: err.config?.params,
                });
                if (err.response?.status === 404) {
                    setInterconsultas([]);
                } else {
                    setError('Error al consultar el listado de interconsultas.');
                }
            } finally {
                setCargando(false);
            }
        };

        obtenerInterconsultas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtrosKey]);

    if (error) {
        return <p style={{ color: 'var(--error-text)', textAlign: 'center' }}>Error: {error}</p>;
    }

    return (
        <div style={{ marginTop: '2rem' }}>
            <h2>Listado de interconsultas registradas</h2>

            {cargando && <p style={{ textAlign: 'center' }}>Actualizando...</p>}

            {interconsultas.length === 0 ? (
                !cargando && <p>Sin resultados</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', backgroundColor: 'var(--surface)' }}>
                    <thead>
                        <tr style={{ textAlign: 'left' }}>
                            <th style={estiloEncabezado}>ID</th>
                            <th style={estiloEncabezado}>Descripcion</th>
                            <th style={estiloEncabezado}>Fecha de inicio</th>
                            <th style={estiloEncabezado}>Persona</th>
                            <th style={estiloEncabezado}>CESFAM</th>
                            <th style={estiloEncabezado}>Hospital</th>
                            <th style={estiloEncabezado}>Especialidad</th>
                            <th style={estiloEncabezado}>Estado</th>
                            <th style={estiloEncabezado}>Prioridad</th>
                            <th style={estiloEncabezado}>Detalle</th>
                        </tr>
                    </thead>
                    <tbody>
                        {interconsultas.map((item) => {
                            const prioridad = normalizarPrioridad(item.prioridadClinica);
                            return (
                                <tr key={item.idFormulario}>
                                    <td style={estiloCelda}>#{item.idFormulario}</td>
                                    <td style={estiloCelda}>{item.descripcion}</td>
                                    <td style={estiloCelda}>{item.fechaInicio}</td>
                                    <td style={estiloCelda}>{item.nombrePersona}</td>
                                    <td style={estiloCelda}>{item.nombreCesfam}</td>
                                    <td style={estiloCelda}>{item.nombreHospital}</td>
                                    <td style={estiloCelda}>{item.nombreEspecialidad || 'No especificada'}</td>
                                    <td style={estiloCelda}>{item.nombreEstado}</td>
                                    <td style={estiloCelda}>
                                        {prioridad ? (
                                            <span style={{ ...estiloEtiqueta, ...estilosPrioridad[prioridad] }}>
                                                {nombresPrioridad[prioridad]}
                                            </span>
                                        ) : (
                                            <span style={estiloEtiqueta}>
                                                {item.prioridadClinica ?? '—'}
                                            </span>
                                        )}
                                    </td>
                                    <td style={estiloCelda}>
                                        <Link
                                            to={`/interconsultas/${item.idFormulario}`}
                                            state={{ interconsulta: item }}
                                        >
                                            Ver
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}