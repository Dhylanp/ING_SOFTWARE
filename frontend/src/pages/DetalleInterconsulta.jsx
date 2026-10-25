import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import EstadoBadge from '../components/EstadoBadge';
import LineaTiempo from '../components/LineaTiempo';
import ModalCierre from '../components/ModalCierre';
import ModalCita from '../components/ModalCita';
import { avisos, mensajeDeError } from '../lib/avisos';
import { E_DEVUELTA, E_FINALIZADA, E_LISTA_ESPERA, normalizarPrioridad } from '../lib/estados';
import { formatearCita } from '../lib/fechas';

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
    const { tieneRol } = useAuth();

    // la ficha se pide a la API; mientras llega se muestra la que mandó el listado
    const [interconsulta, setInterconsulta] = useState(location.state?.interconsulta || null);
    const [errorFicha, setErrorFicha] = useState('');
    const [recargaFicha, setRecargaFicha] = useState(0);

    // HU07: historial de estados
    const [historial, setHistorial] = useState([]);
    const [cargandoHistorial, setCargandoHistorial] = useState(true);
    const [errorHistorial, setErrorHistorial] = useState('');

    // modales de cierre (HU09) y de hora médica (HU17)
    const [modal, setModal] = useState(null); // 'cierre' | 'cita' | null
    const [procesando, setProcesando] = useState(false);

    const puedeGestionar = tieneRol(1) || tieneRol(2);

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

    // carga la ficha completa y el historial
    useEffect(() => {
        let activo = true;
        api.get(`/formulario/${id}`)
            .then((r) => {
                if (activo) {
                    setInterconsulta(r.data);
                    setErrorFicha('');
                }
            })
            .catch((err) => {
                if (activo) setErrorFicha(mensajeDeError(err, 'No se pudo cargar la ficha de la interconsulta.'));
            });

        if (puedeGestionar) {
            api.get(`/formulario/${id}/historial`)
                .then((r) => {
                    if (activo) {
                        setHistorial(Array.isArray(r.data) ? r.data : []);
                        setErrorHistorial('');
                    }
                })
                .catch((err) => {
                    if (activo) setErrorHistorial(mensajeDeError(err, 'No se pudo cargar el historial.'));
                })
                .finally(() => activo && setCargandoHistorial(false));
        } else {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- sin permiso no hay historial que esperar
            setCargandoHistorial(false);
        }
        return () => {
            activo = false;
        };
        // puedeGestionar depende solo de la sesión
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, recargaFicha]);

    // HU09 / HU17: acciones que cambian el estado
    const cerrar = async (causal) => {
        setProcesando(true);
        try {
            await api.post(`/formulario/${id}/cierre`, { causal });
            setModal(null);
            setRecargaFicha((n) => n + 1);
            avisos.exito('Interconsulta finalizada', `Causal de cierre: ${causal}.`);
        } catch (err) {
            avisos.error('No se pudo cerrar', mensajeDeError(err));
        } finally {
            setProcesando(false);
        }
    };

    const agendar = async ({ fecha, hora, centro }) => {
        setProcesando(true);
        try {
            await api.post(`/formulario/${id}/cita`, { fecha, hora, centro: centro || null });
            setModal(null);
            setRecargaFicha((n) => n + 1);
            avisos.exito('Hora médica asignada', 'Se envió un correo al paciente con la fecha, la hora y el centro.');
        } catch (err) {
            avisos.error('No se pudo asignar la hora', mensajeDeError(err));
        } finally {
            setProcesando(false);
        }
    };

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

            avisos.fire({
                icon: 'success',
                title: 'Documento adjuntado',
                text: respuesta.data.mensaje || 'El documento se adjuntó correctamente.',
            });
        } catch (err) {
            const detalle = err.response?.data?.detail;

            avisos.fire({
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

            {errorFicha && !interconsulta && <p className="texto-error">{errorFicha}</p>}

            {interconsulta ? (
                <div
                    style={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '16px',
                        textAlign: 'left',
                    }}
                >
                    <p style={estiloDato}><strong>Paciente:</strong> {interconsulta.nombrePersona}</p>
                    <p style={estiloDato}><strong>CESFAM de origen:</strong> {interconsulta.nombreCesfam}</p>
                    <p style={estiloDato}><strong>Hospital de destino:</strong> {interconsulta.nombreHospital}</p>
                    <p style={estiloDato}><strong>Especialidad de destino:</strong> {interconsulta.nombreEspecialidad || 'No especificada'}</p>
                    <p style={estiloDato}><strong>Fecha de inicio:</strong> {interconsulta.fechaInicio}</p>
                    <p style={estiloDato}>
                        <strong>Estado:</strong>{' '}
                        <EstadoBadge idEstado={interconsulta.idEstado} nombre={interconsulta.nombreEstado} />
                    </p>
                    <p style={estiloDato}>
                        <strong>Prioridad:</strong>{' '}
                        {nombresPrioridad[normalizarPrioridad(interconsulta.prioridadClinica)] || interconsulta.prioridadClinica}
                    </p>
                    <p style={estiloDato}><strong>Motivo:</strong> {interconsulta.descripcion}</p>
                    {interconsulta.fechaCita && (
                        <p style={estiloDato}>
                            <strong>Hora médica:</strong> {formatearCita(interconsulta.fechaCita)}
                            {interconsulta.centroCita ? ` · ${interconsulta.centroCita}` : ''}
                        </p>
                    )}
                    {interconsulta.causalCierre && (
                        <p style={estiloDato}><strong>Causal de cierre:</strong> {interconsulta.causalCierre}</p>
                    )}
                    {Number(interconsulta.idEstado) === E_DEVUELTA && interconsulta.motivoDevolucion && (
                        <div
                            data-testid="bloque-devolucion"
                            style={{ marginTop: '10px', padding: '10px', borderRadius: '6px', backgroundColor: 'var(--error-bg)', color: 'var(--error-text)' }}
                        >
                            <p><strong>Motivo de devolución:</strong> {interconsulta.motivoDevolucion}</p>
                            {interconsulta.observacionDevolucion && (
                                <p><strong>Observaciones:</strong> {interconsulta.observacionDevolucion}</p>
                            )}
                        </div>
                    )}

                    {/* acciones según rol y estado */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '14px' }}>
                        {tieneRol(1) && Number(interconsulta.idEstado) !== E_FINALIZADA && (
                            <Link to={`/interconsultas/${id}/editar`}>Modificar datos administrativos</Link>
                        )}
                        {tieneRol(1) && Number(interconsulta.idEstado) === E_DEVUELTA && (
                            <Link to={`/interconsultas/${id}/corregir`}>Corregir y reenviar</Link>
                        )}
                        {puedeGestionar && Number(interconsulta.idEstado) === E_LISTA_ESPERA && (
                            <button type="button" onClick={() => setModal('cita')}>Asignar hora médica</button>
                        )}
                        {puedeGestionar && Number(interconsulta.idEstado) !== E_FINALIZADA && (
                            <button type="button" className="btn-peligro" onClick={() => setModal('cierre')}>
                                Cerrar interconsulta
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                !errorFicha && <p style={{ color: 'var(--text-muted)' }}>Cargando ficha...</p>
            )}

            {puedeGestionar && (
                <>
                    <h3 style={{ marginTop: '24px' }}>Historial de estados</h3>
                    <LineaTiempo eventos={historial} cargando={cargandoHistorial} error={errorHistorial} />
                </>
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

            <ModalCierre abierto={modal === 'cierre'} onCerrar={() => setModal(null)} onConfirmar={cerrar} enviando={procesando} />
            <ModalCita
                key={interconsulta?.nombreHospital || 'sin-hospital'}
                abierto={modal === 'cita'}
                onCerrar={() => setModal(null)}
                onConfirmar={agendar}
                centroSugerido={interconsulta?.nombreHospital || ''}
                enviando={procesando}
            />
        </div>
    );
}
