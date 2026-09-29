import { useState, useEffect } from 'react'

export default function TablaInterconsultas() {
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
                const respuesta = await fetch('http://localhost:5000/api/interconsultas');

                if (!respuesta.ok) {
                    throw new Error('Error al consultar el listado de interconsultas.');
                }

                const datos = await respuesta.json();

                setInterconsultas(datos.data);
            } catch (err) { 
                setError(err.message);
            } finally {
                setCargando(false);
            }
        };

        obtenerInterconsultas();
    }, []);

    //renderizado condicional si esta cargando
    if (cargando) {
        return <p style={{ textAlign: 'center' }}>Cargando listado de interconsultas...</p>;
    }

    //renderizado condicional si hubo un error
    if (error) {
        return <p style={{ color: '#ff6b6b', textAlign: 'center' }}>Error: {error}</p>;
    }

    return (
        <div style={{ marginTop: '2rem' }}>
            <h2>Listado de interconsultas registradas</h2>

            {/*si la lista esta vacia se muestra un mensaje*/}
            {interconsultas.length === 0 ? (
                <p>no hay interconsultas registradas en el sistema.</p>
            ) : (
                /*renderizado de la tabla cuando existen registros */
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#2a2a2a', textAlign: 'left' }}>
                            <th style={{ padding: '8px', border: '1px solid #444' }}>ID</th>
                            <th style={{ padding: '8px', border: '1px solid #444' }}>RUT Paciente</th>
                            <th style={{ padding: '8px', border: '1px solid #444' }}>Especialidad</th>
                            <th style={{ padding: '8px', border: '1px solid #444' }}>Prioridad</th>
                            <th style={{ padding: '8px', border: '1px solid #444' }}>Estado</th>
                            <th style={{ padding: '8px', border: '1px solid #444' }}>Motivo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/*se recorre el arreglo con .map() para generar una fila (tr) por cada elemento */}
                        {interconsultas.map((item) => (
                            <tr key={item.id}>
                                <td style={{ padding: '8px', border: '1px solid #444' }}>#{item.id}</td>
                                <td style={{ padding: '8px', border: '1px solid #444' }}>{item.pacienteRut}</td>
                                <td style={{ padding: '8px', border: '1px solid #444' }}>{item.especialidadDestino}</td>
                                <td style={{ padding: '8px', border: '1px solid #444' }}>{item.prioridadClinica}</td>
                                <td style={{ padding: '8px', border: '1px solid #444' }}>{item.estado}</td>
                                <td style={{ padding: '8px', border: '1px solid #444' }}>{item.motivoDerivacion}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}