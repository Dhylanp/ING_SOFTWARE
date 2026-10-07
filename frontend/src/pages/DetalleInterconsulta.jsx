import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const estiloDato = { margin: '6px 0', color: 'var(--text)' };

const nombresPrioridad = { alta: 'Alta', media: 'Media', baja: 'Baja' };

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

// borde rojo cuando el campo tiene un error
const estiloCampo = (hayError) => ({
    width: '100%',
    ...(hayError ? { border: '1px solid var(--danger)' } : {}),
});

// revisa el archivo elegido y devuelve el mensaje de error ('' si está bien)
const validarArchivo = (archivo) => {
    if (!archivo.name.toLowerCase().endsWith('.pdf')) {
        return 'Solo se permiten archivos PDF.';
    }
    if (archivo.size === 0) {
        return 'El archivo está vacío.';
    }
    if (archivo.size > MAX_BYTES) {
        return 'El archivo supera el máximo de 5 MB.';
    }
    return '';
};

const formatearTamano = (bytes) => {
    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// la API manda "2026-10-06T15:30:00"; se muestra como 06-10-2026
const formatearFecha = (fecha) => {
    const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
    return `${dia}-${mes}-${anio}`;
};

export default function DetalleInterconsulta() {
    // el :id sale de la URL (/interconsultas/5 -> id = "5")
    const { id } = useParams();
    // datos que mandó el listado al hacer clic en "Ver"
    const location = useLocation();
    const interconsulta = location.state?.interconsulta || null;
    const { tieneRol } = useAuth();

    const [documentos, setDocumentos] = useState([]);
    const [cargandoDocs, setCargandoDocs] = useState(true);
    const [errorDocs, setErrorDocs] = useState('');
    // cada vez que sube este número, se vuelve a pedir la lista a la API
    const [recarga, setRecarga] = useState(0);

    const [archivo, setArchivo] = useState(null);
    const [errorArchivo, setErrorArchivo] = useState('');
    const [subiendo, setSubiendo] = useState(false);
    // cambiar la key del input lo vacía (React lo vuelve a crear)
    const [inputKey, setInputKey] = useState(0);

    // carga la lista de documentos de esta interconsulta
    useEffect(() => {
        let activo = true;

        const obtenerDocumentos = async () => {
            try {
                const respuesta = await api.get(`/formulario/${id}/documentos`);
                if (activo) {
                    setDocumentos(Array.isArray(respuesta.data) ? respuesta.data : []);
                    setErrorDocs('');
                }
            } catch (err) {
                console.error('[DetalleInterconsulta] Error documentos:', err);
                if (activo) {
                    setErrorDocs(
                        err.response?.status === 404
                            ? 'La interconsulta no existe.'
                            : 'No se pudo cargar la lista de documentos.'
                    );
                }
            } finally {
                if (activo) setCargandoDocs(false);
            }
        };

        obtenerDocumentos();

        return () => {
            activo = false;
        };
    }, [id, recarga]);

    // al elegir un archivo se valida de inmediato (peso y formato)
    const handleArchivo = (e) => {
        const elegido = e.target.files[0];

        if (!elegido) {
            setArchivo(null);
            setErrorArchivo('');
            return;
        }

        const mensaje = validarArchivo(elegido);
        if (mensaje) {
            setArchivo(null);
            setErrorArchivo(mensaje);
            setInputKey((k) => k + 1); // vacía el input para poder elegir otro
            return;
        }

        setArchivo(elegido);
        setErrorArchivo('');
    };

    const handleSubir = async (e) => {
        e.preventDefault();

        if (!archivo) {
            setErrorArchivo('Seleccione un archivo PDF.');
            return;
        }

        // la API espera el archivo en un campo llamado "archivo"
        const datos = new FormData();
        datos.append('archivo', archivo);

        setSubiendo(true);
        try {
            const respuesta = await api.post(`/formulario/${id}/documentos`, datos, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setArchivo(null);
            setErrorArchivo('');
            setInputKey((k) => k + 1);
            setRecarga((r) => r + 1);

            Swal.fire({
                icon: 'success',
                title: 'Documento adjuntado',
                text: respuesta.data.mensaje || 'El documento se adjuntó correctamente.',
            });
        } catch (err) {
            const detalle = err.response?.data?.detail;

            Swal.fire({
                icon: 'error',
                title: 'No se pudo adjuntar',
                text: typeof detalle === 'string' ? detalle : 'Error al procesar la solicitud',
            });
        } finally {
            setSubiendo(false);
        }
    };

    return (
        <div style={{ width: '100%', maxWidth: '900px', margin: '40px auto', padding: '20px', boxSizing: 'border-box' }}>
            <Link to="/interconsultas/listado">← Volver al listado</Link>

            <h2 style={{ marginTop: '16px' }}>Interconsulta #{id}</h2>

            {interconsulta ? (
                <div
                    style={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '16px',
                    }}
                >
                    <p style={estiloDato}><strong>Paciente:</strong> {interconsulta.nombrePersona}</p>
                    <p style={estiloDato}><strong>CESFAM de origen:</strong> {interconsulta.nombreCesfam}</p>
                    <p style={estiloDato}><strong>Hospital de destino:</strong> {interconsulta.nombreHospital}</p>
                    <p style={estiloDato}><strong>Especialidad de destino:</strong> {interconsulta.nombreEspecialidad || 'No especificada'}</p>
                    <p style={estiloDato}><strong>Fecha de inicio:</strong> {interconsulta.fechaInicio}</p>
                    <p style={estiloDato}><strong>Estado:</strong> {interconsulta.nombreEstado}</p>
                    <p style={estiloDato}>
                        <strong>Prioridad:</strong>{' '}
                        {nombresPrioridad[interconsulta.prioridadClinica] || interconsulta.prioridadClinica}
                    </p>
                    <p style={estiloDato}><strong>Motivo:</strong> {interconsulta.descripcion}</p>
                </div>
            ) : (
                <p style={{ color: 'var(--text-muted)' }}>
                    Para ver los datos de la interconsulta, vuelve al listado y entra con el botón "Ver".
                </p>
            )}

            <h3 style={{ marginTop: '24px' }}>Documentos adjuntos</h3>

            {/* solo el rol 1 puede adjuntar documentos */}
            {tieneRol(1) && (
                <form onSubmit={handleSubir} noValidate style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                        Adjuntar antecedentes (PDF, máximo 5 MB):
                    </label>
                    <input
                        key={inputKey}
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={handleArchivo}
                        style={estiloCampo(Boolean(errorArchivo))}
                    />
                    {errorArchivo && (
                        <small className="texto-error" style={{ display: 'block', marginTop: '4px' }}>
                            {errorArchivo}
                        </small>
                    )}
                    <button
                        type="submit"
                        disabled={subiendo}
                        style={{ marginTop: '10px', fontWeight: 'bold' }}
                    >
                        {subiendo ? 'Subiendo...' : 'Adjuntar documento'}
                    </button>
                </form>
            )}

            {cargandoDocs && <p>Cargando documentos...</p>}

            {errorDocs && <p className="texto-error">{errorDocs}</p>}

            {!cargandoDocs && !errorDocs && documentos.length === 0 && (
                <p style={{ color: 'var(--text-muted)' }}>Esta interconsulta aún no tiene documentos adjuntos.</p>
            )}

            {documentos.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--surface)' }}>
                    <thead>
                        <tr style={{ textAlign: 'left' }}>
                            <th style={estiloEncabezado}>Documento</th>
                            <th style={estiloEncabezado}>Tamaño</th>
                            <th style={estiloEncabezado}>Fecha</th>
                            <th style={estiloEncabezado}>Ver</th>
                        </tr>
                    </thead>
                    <tbody>
                        {documentos.map((doc) => (
                            <tr key={doc.idDocumento}>
                                <td style={estiloCelda}>{doc.nombreArchivo}</td>
                                <td style={estiloCelda}>{formatearTamano(doc.tamanoBytes)}</td>
                                <td style={estiloCelda}>{formatearFecha(doc.fechaSubida)}</td>
                                <td style={estiloCelda}>
                                    <a
                                        href={`${api.defaults.baseURL}/documentos/${doc.idDocumento}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Abrir PDF
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}