import { useState, useEffect } from 'react'
import api from '../api/axios';

const nombresEstado = {
    1: 'Registrada',
    2: 'En lista de espera',
    3: 'Devuelta',
    4: 'Enviada',
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

                //peticion GET al endpoint de la HU02
                const respuesta = await fetch('https://ingsoftware-production-4899.up.railway.app/formulario/0/0/0/0/0');

                if (!respuesta.ok) {
                    throw new Error('Error al consultar el listado de interconsultas.');
                }

                const datos = await respuesta.json();

                setInterconsultas(datos);
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
        return <p style={{ color: '#ff6b6b', textAlign: 'center' }}>Error: {error}</p>;
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
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#2a2a2a', textAlign: 'left' }}>
                            <th style={{ padding: '8px', border: '1px solid #444' }}>ID</th>
                            <th style={{ padding: '8px', border: '1px solid #444' }}>Descripcion</th>
                            <th style={{ padding: '8px', border: '1px solid #444' }}>Fecha de inicio</th>
                            <th style={{ padding: '8px', border: '1px solid #444' }}>Persona</th>
                            <th style={{ padding: '8px', border: '1px solid #444' }}>CESFAM</th>
                            <th style={{ padding: '8px', border: '1px solid #444' }}>Hospital</th>
                            <th style={{ padding: '8px', border: '1px solid #444' }}>Estado</th>
                            <th style={{ padding: '8px', border: '1px solid #444' }}>Prioridad</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/*se recorre el arreglo con .map() para generar una fila (tr) por cada elemento */}
                        {interconsultas.map((item) => (
                            <tr key={item.idFormulario}>
                                <td style={{ padding: '8px', border: '1px solid #444' }}>#{item.idFormulario}</td>
                                <td style={{ padding: '8px', border: '1px solid #444' }}>{item.descripcion}</td>
                                <td style={{ padding: '8px', border: '1px solid #444' }}>{item.fechaInicio}</td>
                                <td style={{ padding: '8px', border: '1px solid #444' }}>{item.idPersona}</td>
                                <td style={{ padding: '8px', border: '1px solid #444' }}>{item.idCesfam}</td>
                                <td style={{ padding: '8px', border: '1px solid #444' }}>{item.idHospital}</td>
                                <td style={{ padding: '8px', border: '1px solid #444' }}>{nombresEstado[item.idEstado] ?? item.idEstado}</td>
                                <td style={{ padding: '8px', border: '1px solid #444' }}>{item.prioridadClinica}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}