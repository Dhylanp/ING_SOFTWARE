import { useState, useEffect } from 'react';
import api from '../api/axios';
import { avisos } from '../lib/avisos';
import { useAuth } from '../context/AuthContext';
import { guardarPendiente } from '../offline/almacen';
import { getConCache } from '../offline/catalogos';
import { esErrorDeRed, hayConexion, publicarSesionParaSW } from '../offline/sync';

const formularioVacio = {
    rut: '',
    idCesfam: '',
    idHospital: '',
    idEspecialidad: '',
    prioridad: '2',
    descripcion: '',
};

// borde rojo cuando el campo tiene un error
const estiloCampo = (hayError) => ({
    width: '100%',
    ...(hayError ? { border: '1px solid var(--danger)' } : {}),
});

// mensaje de error bajo un campo
const estiloMensaje = { display: 'block', marginTop: '4px' };

export default function RegistrarInterconsulta() {
    const { usuario } = useAuth();

    const [formData, setFormData] = useState(formularioVacio);
    const [errores, setErrores] = useState({});
    const [personas, setPersonas] = useState([]);
    const [hospitales, setHospitales] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    const [cargandoEspecialidades, setCargandoEspecialidades] = useState(false);
    const [cargandoHospitales, setCargandoHospitales] = useState(false);
    const [busquedaHospital, setBusquedaHospital] = useState('');
    const [listaAbierta, setListaAbierta] = useState(false);
    const [listaRutAbierta, setListaRutAbierta] = useState(false);

    // CESFAM del médico: salen de los accesos con rol 1 que trae la sesión
    const cesfamsMedico = (usuario?.accesos || []).filter(
        (a) => Number(a.idRol) === 1 && a.tipoCentro === 'Cesfam'
    );
    // si tiene uno solo, se usa ese; si tiene varios, se usa el que elija
    const idCesfamFinal =
        cesfamsMedico.length === 1 ? cesfamsMedico[0].idCentro : formData.idCesfam;

    // busca al paciente por RUT (ignora puntos y espacios)
    const rutLimpio = formData.rut.replace(/[.\s]/g, '').toLowerCase();
    const rutListo = /^\d{7,8}-[\dk]$/.test(rutLimpio);
    const paciente = rutListo
        ? personas.find((p) => {
            const [rutTexto, dv] = rutLimpio.split('-');
            return String(p.rut) === rutTexto && String(p.dv).toLowerCase() === dv;
        }) || null
        : null;

    // RUT que coinciden con lo escrito (ignora puntos y espacios), máximo 8 sugerencias
    const sugerenciasRut = rutLimpio.length >= 1
        ? personas
            .filter((p) => `${p.rut}-${p.dv}`.toLowerCase().startsWith(rutLimpio))
            .slice(0, 8)
        : [];

    const elegirRut = (p) => {
        setFormData({ ...formData, rut: `${p.rut}-${p.dv}` });
        setListaRutAbierta(false);
        if (errores.rut) setErrores({ ...errores, rut: '' });
    };

    // mensaje bajo el RUT: el error de validación o, mientras escribe, "no encontrado"
    const mensajeRut =
        errores.rut ||
        (rutListo && !paciente && personas.length > 0
            ? 'No se encontró un paciente con ese RUT.'
            : '');

    // carga la lista de personas al abrir la pantalla
    useEffect(() => {
        const obtenerPersonas = async () => {
            try {
                const respuesta = await getConCache('/persona');
                setPersonas(Array.isArray(respuesta.data) ? respuesta.data : []);
            } catch (err) {
                console.error('[RegistrarInterconsulta] Error personas:', err);
                avisos.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo cargar la lista de pacientes.'
                });
            }
        };

        obtenerPersonas();
    }, []);

    // carga la lista de hospitales al abrir la pantalla
    useEffect(() => {
        const obtenerHospitales = async () => {
            setCargandoHospitales(true);
            try {
                const url = '/hospital/0';
                console.log('[RegistrarInterconsulta] GET', url, 'baseURL:', api.defaults.baseURL);

                const respuesta = await getConCache(url);

                const lista = Array.isArray(respuesta.data) ? respuesta.data : [];
                setHospitales(lista);
            } catch (err) {
                console.error('[RegistrarInterconsulta] Error hospitales:', err);
                console.error('[RegistrarInterconsulta] Response:', err.response);
                console.error('[RegistrarInterconsulta] Message:', err.message);

                let texto;
                if (err.response) {
                    texto = `Error del servidor (${err.response.status}): ${typeof err.response.data?.detail === 'string'
                        ? err.response.data.detail
                        : 'No se pudo cargar la lista de hospitales.'
                        }`;
                } else if (err.request) {
                    texto = 'No hubo respuesta del servidor. Verifique la URL del backend y CORS.';
                } else {
                    texto = 'Error al configurar la petición: ' + err.message;
                }

                avisos.fire({
                    icon: 'error',
                    title: 'Error al cargar hospitales',
                    text: texto
                });
            } finally {
                setCargandoHospitales(false);
            }
        };

        obtenerHospitales();
    }, []);

    // carga la lista de especialidades al abrir la pantalla
    useEffect(() => {
        const obtenerEspecialidades = async () => {
            setCargandoEspecialidades(true);
            try {
                const respuesta = await getConCache('/especialidad');
                setEspecialidades(Array.isArray(respuesta.data) ? respuesta.data : []);
            } catch (err) {
                console.error('[RegistrarInterconsulta] Error especialidades:', err);
                avisos.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo cargar la lista de especialidades.'
                });
            } finally {
                setCargandoEspecialidades(false);
            }
        };

        obtenerEspecialidades();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // al corregir un campo se le quita su error
        if (errores[name]) {
            setErrores({ ...errores, [name]: '' });
        }
    };

    // revisa los datos obligatorios y devuelve un objeto con los errores encontrados
    const validar = () => {
        const nuevos = {};

        if (!formData.rut.trim()) {
            nuevos.rut = 'Ingrese el RUT del paciente.';
        } else if (!rutListo) {
            nuevos.rut = 'El RUT debe tener el formato 12345678-9.';
        } else if (!paciente) {
            nuevos.rut = 'No se encontró un paciente con ese RUT.';
        }

        if (!idCesfamFinal) {
            nuevos.idCesfam = 'Seleccione el CESFAM de origen.';
        }

        if (!formData.idHospital) {
            nuevos.idHospital = 'Seleccione un hospital de destino.';
        }

        if (!formData.idEspecialidad) {
            nuevos.idEspecialidad = 'Seleccione la especialidad de destino.';
        }

        if (!formData.descripcion.trim()) {
            nuevos.descripcion = 'Escriba el motivo de la derivación.';
        }

        return nuevos;
    };

    // quita tildes y mayúsculas para comparar ("Hospital Sótero" coincide con "sotero")
    const normalizar = (texto) =>
        String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const hospitalesFiltrados = hospitales.filter((h) =>
        normalizar(h.nombreHospital).includes(normalizar(busquedaHospital))
    );

    const elegirHospital = (h) => {
        setFormData({ ...formData, idHospital: String(h.idHospital) });
        setBusquedaHospital(h.nombreHospital);
        setListaAbierta(false);
        if (errores.idHospital) setErrores({ ...errores, idHospital: '' });
    };

    const cambiarBusquedaHospital = (e) => {
        setBusquedaHospital(e.target.value);
        setListaAbierta(true);
        // si escribe de nuevo, se descarta el hospital elegido antes
        if (formData.idHospital) setFormData({ ...formData, idHospital: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const nuevos = validar();
        setErrores(nuevos);

        // si hay errores no se envía nada
        if (Object.keys(nuevos).length > 0) {
            avisos.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Hay campos pendientes o con errores. Revise los marcados en rojo.'
            });
            return;
        }

        const payload = {
            descripcion: formData.descripcion.trim(),
            fechaInicio: new Date().toLocaleDateString('en-CA'),
            idPersona: Number(paciente.idPersona),
            idCesfam: Number(idCesfamFinal),
            idHospital: Number(formData.idHospital),
            idEspecialidad: Number(formData.idEspecialidad),
            prioridad: formData.prioridad,
        };

        // HU19: sin internet el registro se guarda en el dispositivo y se envía después
        const guardarSinConexion = async () => {
            await guardarPendiente({ payload, nombrePaciente: paciente.nombrePersona });
            await publicarSesionParaSW().catch(() => { });
            setFormData(formularioVacio);
            setBusquedaHospital('');
            setErrores({});
            avisos.fire({
                icon: 'info',
                title: 'Guardado sin conexión',
                text: 'No hay conexión a internet. La interconsulta se guardó en este dispositivo (modo offline) y se enviará automáticamente cuando vuelva la conexión.'
            });
        };

        if (!hayConexion()) {
            try {
                await guardarSinConexion();
            } catch (errLocal) {
                console.error('[RegistrarInterconsulta] No se pudo guardar localmente:', errLocal);
                avisos.fire({
                    icon: 'error',
                    title: 'No se pudo guardar',
                    text: 'No hay conexión y tampoco fue posible guardar el registro en este dispositivo.'
                });
            }
            return;
        }

        try {
            const respuesta = await api.post('/formulario', payload);

            setFormData(formularioVacio);
            setErrores({});

            avisos.fire({
                icon: 'success',
                title: 'Interconsulta registrada',
                text: respuesta.data.mensaje || 'La interconsulta fue registrada correctamente.'
            });
        } catch (err) {
            // la conexión se cayó justo al enviar: también se guarda localmente
            if (esErrorDeRed(err)) {
                try {
                    await guardarSinConexion();
                    return;
                } catch (errLocal) {
                    console.error('[RegistrarInterconsulta] No se pudo guardar localmente:', errLocal);
                }
            }
            const detalle = err.response?.data?.detail;

            avisos.fire({
                icon: 'error',
                title: 'Error',
                text: typeof detalle === 'string' ? detalle : 'Error al procesar la solicitud'
            });
        }
    };

    return (
        <div style={{ width: '100%', maxWidth: '900px', margin: '40px auto', padding: '20px', boxSizing: 'border-box' }}>

            <h2>Registrar Interconsulta (Atención Primaria)</h2>
            <p style={{ color: 'var(--text-muted)' }}>Ingrese los datos básicos para tramitar la derivación del paciente.</p>

            <form onSubmit={handleSubmit} noValidate>
                {/* rut del paciente */}
                <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>RUT del Paciente (*):</label>
                    <input
                        type="text"
                        name="rut"
                        placeholder="Ej: 12345678-9"
                        value={formData.rut}
                        onChange={(e) => {
                            handleChange(e);
                            setListaRutAbierta(true);
                        }}
                        onFocus={() => setListaRutAbierta(true)}
                        onBlur={() => setTimeout(() => setListaRutAbierta(false), 150)}
                        autoComplete="off"
                        style={estiloCampo(Boolean(mensajeRut))}
                    />
                    {listaRutAbierta && !paciente && sugerenciasRut.length > 0 && (
                        <ul
                            style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 10,
                                maxHeight: '220px',
                                overflowY: 'auto',
                                margin: '4px 0 0',
                                padding: 0,
                                listStyle: 'none',
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                boxShadow: 'var(--shadow)',
                            }}
                        >
                            {sugerenciasRut.map((p) => (
                                <li
                                    key={p.idPersona}
                                    role="option"
                                    onMouseDown={() => elegirRut(p)}
                                    style={{ padding: '8px 10px', cursor: 'pointer', color: 'var(--text-h)' }}
                                >
                                    {p.rut}-{p.dv} — {p.nombrePersona}
                                </li>
                            ))}
                        </ul>
                    )}

                    {paciente && (
                        <small style={{ ...estiloMensaje, color: 'var(--success-text)' }}>
                            Paciente: <strong>{paciente.nombrePersona}</strong>
                        </small>
                    )}
                    {mensajeRut && (
                        <small className="texto-error" style={estiloMensaje}>
                            {mensajeRut}
                        </small>
                    )}
                </div>

                {/* cesfam del médico */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>CESFAM de origen (*):</label>
                    {cesfamsMedico.length === 1 && (
                        <input
                            type="text"
                            value={cesfamsMedico[0].nombreCentro}
                            readOnly
                            style={{ width: '100%' }}
                        />
                    )}
                    {cesfamsMedico.length > 1 && (
                        <>
                            <select
                                name="idCesfam"
                                value={formData.idCesfam}
                                onChange={handleChange}
                                style={estiloCampo(Boolean(errores.idCesfam))}
                            >
                                <option value="">Seleccione un CESFAM</option>
                                {cesfamsMedico.map((c) => (
                                    <option key={c.idCentro} value={c.idCentro}>
                                        {c.nombreCentro}
                                    </option>
                                ))}
                            </select>
                            {errores.idCesfam && (
                                <small className="texto-error" style={estiloMensaje}>
                                    {errores.idCesfam}
                                </small>
                            )}
                        </>
                    )}
                    {cesfamsMedico.length === 0 && (
                        <small className="texto-error" style={estiloMensaje}>
                            Tu sesión no tiene un CESFAM asociado.
                        </small>
                    )}
                </div>

                {/* selector de hospital de destino */}
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        name="busquedaHospital"
                        placeholder={cargandoHospitales ? 'Cargando hospitales...' : 'Escriba para buscar un hospital'}
                        value={busquedaHospital}
                        onChange={cambiarBusquedaHospital}
                        onFocus={() => setListaAbierta(true)}
                        onBlur={() => setTimeout(() => setListaAbierta(false), 150)}
                        disabled={cargandoHospitales}
                        autoComplete="off"
                        style={estiloCampo(Boolean(errores.idHospital))}
                    />
                    {listaAbierta && !cargandoHospitales && (
                        <ul
                            style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 10,
                                maxHeight: '220px',
                                overflowY: 'auto',
                                margin: '4px 0 0',
                                padding: 0,
                                listStyle: 'none',
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                boxShadow: 'var(--shadow)',
                            }}
                        >
                            {hospitalesFiltrados.length === 0 ? (
                                <li style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                                    Ningún hospital coincide con lo escrito.
                                </li>
                            ) : (
                                hospitalesFiltrados.map((h) => (
                                    <li
                                        key={h.idHospital}
                                        role="option"
                                        onMouseDown={() => elegirHospital(h)}
                                        style={{ padding: '8px 10px', cursor: 'pointer', color: 'var(--text-h)' }}
                                    >
                                        {h.nombreHospital}
                                    </li>
                                ))
                            )}
                        </ul>
                    )}
                </div>

                {/* selector de especialidad de destino */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Especialidad de Destino (*):</label>
                    <select
                        name="idEspecialidad"
                        value={formData.idEspecialidad}
                        onChange={handleChange}
                        disabled={cargandoEspecialidades}
                        style={estiloCampo(Boolean(errores.idEspecialidad))}
                    >
                        <option value="">
                            {cargandoEspecialidades ? 'Cargando especialidades...' : 'Seleccione una especialidad'}
                        </option>
                        {especialidades.map((esp) => (
                            <option key={esp.idEspecialidad} value={esp.idEspecialidad}>
                                {esp.nombreEspecialidad}
                            </option>
                        ))}
                    </select>
                    {errores.idEspecialidad && (
                        <small className="texto-error" style={estiloMensaje}>
                            {errores.idEspecialidad}
                        </small>
                    )}
                </div>

                {/* selector de prioridad clinica */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Prioridad Clínica (*):</label>
                    <select
                        name="prioridad"
                        value={formData.prioridad}
                        onChange={handleChange}
                        style={{ width: '100%' }}
                    >
                        <option value="3">Baja</option>
                        <option value="2">Media</option>
                        <option value="1">Alta</option>
                    </select>
                </div>

                {/* motivo de derivacion */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Motivo de Derivación (*):</label>
                    <textarea
                        name="descripcion"
                        rows="4"
                        maxLength={200}
                        placeholder="Describa brevemente el motivo clínico..."
                        value={formData.descripcion}
                        onChange={handleChange}
                        style={estiloCampo(Boolean(errores.descripcion))}
                    />
                    {errores.descripcion && (
                        <small className="texto-error" style={estiloMensaje}>
                            {errores.descripcion}
                        </small>
                    )}
                </div>

                {/* boton de envio */}
                <button
                    type="submit"
                    style={{
                        padding: '10px 20px',
                        fontWeight: 'bold'
                    }}
                >
                    Guardar y emitir interconsulta
                </button>
            </form >
        </div >
    );
}