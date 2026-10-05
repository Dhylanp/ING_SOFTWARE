import { useState, useEffect } from 'react'
import api from '../api/axios';

const nombresEstado = {
    1: 'Registrada',
    2: 'En lista de espera',
    3: 'Devuelta',
    4: 'Enviada',
};

const nombresPrioridad = {
    1: 'Alta',
    2: 'Media',
    3: 'Baja',
};

// el selector guarda 1, 2 o 3, pero el endpoint /formulario/filtrar espera texto
const prioridadApi = {
    1: 'alta',
    2: 'media',
    3: 'baja',
};

// colores de la etiqueta según la prioridad (1 alta, 2 media, 3 baja)
const estilosPrioridad = {
    1: { backgroundColor: 'var(--error-bg)', color: 'var(--error-text)' },
    2: { backgroundColor: 'var(--warning-bg)', color: 'var(--warning-text)' },
    3: { backgroundColor: 'var(--success-bg)', color: 'var(--success-text)' },
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
    //estado para almacenar la lista de interconsultas del backend
    const [interconsultas, setInterconsultas] = useState([]);
    //estados para manejar la experiencia de usuario
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    // useEffect ejecuta la peticion http en cuanto se monta en la pantalla
    useEffect(() => {
        const obtenerInterconsultas = async () => {
            try {
                setCargando(true);
                setError(null);

                // solo se mandan los filtros que el usuario eligió
                const params = {};
                if (filtros.estados.length > 0) params.estados = filtros.estados.join(',');
                if (filtros.prioridad !== 0) params.prioridad = prioridadApi[filtros.prioridad];
                if (filtros.desde) params.desde = filtros.desde;
                if (filtros.hasta) params.hasta = filtros.hasta;

                const respuesta = await api.get('/formulario/filtrar', { params });
                setInterconsultas(respuesta.data);
            } catch (err) {
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
    }, [filtros]);

    //renderizado condicional si esta cargando

    //renderizado condicional si hubo un error
    if (error) {
        return <p style={{ color: 'var(--error-text)', textAlign: 'center' }}>Error: {error}</p>;
    }

    return (
        <div style={{ marginTop: '2rem' }}>
            <h2>Listado de interconsultas registradas</h2>

            {cargando && <p style={{ textAlign: 'center' }}>Actualizando...</p>}

            {/*si la lista esta vacia se muestra un mensaje*/}
            {interconsultas.length === 0 ? (
                !cargando && <p>no hay interconsultas registradas en el sistema.</p>
            ) : (
                /*renderizado de la tabla cuando existen registros */
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', backgroundColor: 'var(--surface)' }}>
                    <thead>
                        <tr style={{ textAlign: 'left' }}>
                            <th style={estiloEncabezado}>ID</th>
                            <th style={estiloEncabezado}>Descripcion</th>
                            <th style={estiloEncabezado}>Fecha de inicio</th>
                            <th style={estiloEncabezado}>Persona</th>
                            <th style={estiloEncabezado}>CESFAM</th>
                            <th style={estiloEncabezado}>Hospital</th>
                            <th style={estiloEncabezado}>Estado</th>
                            <th style={estiloEncabezado}>Prioridad</th>
                        </tr>
                    </thead>
                    <tbody>
                        {interconsultas.map((item) => (
                            <tr key={item.idFormulario}>
                                <td style={estiloCelda}>#{item.idFormulario}</td>
                                <td style={estiloCelda}>{item.descripcion}</td>
                                <td style={estiloCelda}>{item.fechaInicio}</td>
                                <td style={estiloCelda}>{item.nombrePersona}</td>
                                <td style={estiloCelda}>{item.nombreCesfam}</td>
                                <td style={estiloCelda}>{item.nombreHospital}</td>
                                <td style={estiloCelda}>{item.nombreEstado}</td>
                                <td style={estiloCelda}>
                                    <span style={{ ...estiloEtiqueta, ...estilosPrioridad[item.prioridadClinica] }}>
                                        {nombresPrioridad[item.prioridadClinica] ?? item.prioridadClinica}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}