import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../api/axios';

// mismas reglas que la API
const TEL_REGEX = /^9\d{8}$/;
const CORREO_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CORREO_MAX = 50;
const CALLE_MIN = 3;
const CALLE_MAX = 50;
const MAX_TELEFONOS = 5;
const MAX_CORREOS = 5;

// ---------- tipos de teléfono legibles ----------
const TIPOS_TELEFONO = {
    P: 'Personal',
    E: 'Emergencia',
};

const nombreTipoTelefono = (tipo) => TIPOS_TELEFONO[tipo] || 'Sin tipo';

// ---------- estilos base ----------

const estiloCampo = (hayError) => ({
    width: '100%',
    ...(hayError
        ? { border: '1px solid var(--danger)', boxShadow: '0 0 0 2px rgba(192,57,43,0.12)' }
        : {}),
});

const estiloMensaje = { display: 'block', marginTop: '4px', fontSize: '13px' };

const estiloEtiqueta = {
    display: 'block',
    fontWeight: '600',
    marginBottom: '6px',
    color: 'var(--text-h)',
    fontSize: '14px',
    textAlign: 'left',
};

const estiloCard = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: 'var(--shadow)',
    textAlign: 'left',
};

const estiloFilaDato = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '10px 0',
    borderBottom: '1px solid var(--border)',
};

const estiloFilaDatoUltima = { ...estiloFilaDato, borderBottom: 'none' };

const estiloValor = { color: 'var(--text-h)', fontWeight: '500' };

const btnPrimario = { padding: '10px 20px', fontWeight: '600', borderRadius: '6px' };
const btnSecundario = {
    padding: '10px 20px',
    fontWeight: '600',
    background: 'var(--surface-alt)',
    color: 'var(--text-h)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
};
const btnPeligro = { padding: '8px 14px', fontWeight: '600', borderRadius: '6px' };

const badge = {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '600',
    background: 'var(--primary-soft)',
    color: 'var(--primary)',
    border: '1px solid var(--primary-soft-border)',
};

const badgeTipo = (tipo) => {
    const esEmergencia = tipo === 'E';
    return {
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        background: esEmergencia ? 'var(--error-bg)' : 'var(--primary-soft)',
        color: esEmergencia ? 'var(--error-text)' : 'var(--primary)',
        border: `1px solid ${esEmergencia ? 'transparent' : 'var(--primary-soft-border)'}`,
    };
};

// ---------- helpers ----------

const separarLista = (texto) =>
    texto ? texto.split(';').map((t) => t.trim()).filter(Boolean) : [];

const parsearTelefonos = (texto) => {
    if (!texto) return [];
    return texto
        .split(';')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((item) => {
            const [numero, tipo] = item.split(':');
            return {
                numero: (numero || '').trim(),
                tipo: (tipo || 'P').trim().toUpperCase(),
            };
        })
        .filter((t) => t.numero);
};

const limpiarTelefono = (texto) => {
    let t = texto.replace(/[\s\-()]/g, '');
    if (t.startsWith('+56')) t = t.slice(3);
    else if (t.startsWith('56') && t.length === 11) t = t.slice(2);
    return t;
};

const limpiarCorreo = (texto) => texto.trim().toLowerCase();
const limpiarCalle = (texto) => texto.split(/\s+/).filter(Boolean).join(' ');

const erroresVacios = {
    calle: '',
    idComuna: '',
    telefonos: [],
    correos: [],
    telefonosApi: '',
    correosApi: '',
};

const quitarPrefijo = (msg) => String(msg).replace(/^Value error, /, '');

const errorCalle = (texto) => {
    const calle = limpiarCalle(texto);
    return calle.length < CALLE_MIN || calle.length > CALLE_MAX
        ? `La calle debe tener entre ${CALLE_MIN} y ${CALLE_MAX} caracteres.`
        : '';
};

const errorComuna = (valor) => (valor ? '' : 'Seleccione una comuna.');

// 👇 recibe lista de { numero, tipo }
const erroresTelefonos = (lista, exigirLleno) => {
    const vistos = [];
    return lista.map((item) => {
        const texto = item.numero || '';
        if (!texto.trim()) {
            return exigirLleno ? 'Ingrese el teléfono o quite este campo.' : '';
        }
        const t = limpiarTelefono(texto);
        if (!TEL_REGEX.test(t)) return 'Debe tener 9 dígitos y empezar con 9.';
        if (vistos.includes(t)) return 'Este teléfono está repetido.';
        vistos.push(t);
        return '';
    });
};

const erroresCorreos = (lista, exigirLleno) => {
    const vistos = [];
    return lista.map((texto) => {
        if (!texto.trim()) {
            return exigirLleno ? 'Ingrese el correo o quite este campo.' : '';
        }
        const c = limpiarCorreo(texto);
        if (c.length > CORREO_MAX) return `Máximo ${CORREO_MAX} caracteres.`;
        if (!CORREO_REGEX.test(c)) return 'Formato esperado: nombre@dominio.cl';
        if (vistos.includes(c)) return 'Este correo está repetido.';
        vistos.push(c);
        return '';
    });
};

export default function FichaPaciente() {
    const [rut, setRut] = useState('');
    const [personas, setPersonas] = useState([]);
    const [contacto, setContacto] = useState(null);
    const [cargandoContacto, setCargandoContacto] = useState(false);
    const [nombre, setNombre] = useState('');
    const [seleccionado, setSeleccionado] = useState(null);

    const [comunas, setComunas] = useState([]);
    const [editando, setEditando] = useState(false);
    const [formEdicion, setFormEdicion] = useState({
        calle: '',
        idComuna: '',
        telefonos: [{ numero: '', tipo: 'P' }],
        correos: [''],
    });
    const [errores, setErrores] = useState(erroresVacios);
    const [guardando, setGuardando] = useState(false);

    const rutLimpio = rut.replace(/[.\s]/g, '').toLowerCase();
    const rutListo = /^\d{7,8}-[\dk]$/.test(rutLimpio);
    const pacientePorRut = rutListo
        ? personas.find((p) => {
            const [rutTexto, dv] = rutLimpio.split('-');
            return String(p.rut) === rutTexto && String(p.dv).toLowerCase() === dv;
        }) || null
        : null;
    const paciente = pacientePorRut || seleccionado;

    let mensajeRut = '';
    if (rut.trim() && !rutListo) {
        mensajeRut = 'El RUT debe tener el formato 12345678-9.';
    } else if (rutListo && !paciente && personas.length > 0) {
        mensajeRut = 'No se encontró un paciente con ese RUT.';
    }

    const normalizar = (texto) =>
        texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const textoNombre = normalizar(nombre);
    const coincidencias = textoNombre.length >= 3
        ? personas.filter((p) => normalizar(p.nombrePersona).includes(textoNombre))
        : [];

    let mensajeNombre = '';
    if (textoNombre && textoNombre.length < 3) {
        mensajeNombre = 'Escriba al menos 3 letras del nombre.';
    } else if (textoNombre.length >= 3 && coincidencias.length === 0 && personas.length > 0) {
        mensajeNombre = 'No se encontró un paciente con ese nombre.';
    }

    const handleRut = (e) => {
        setRut(e.target.value);
        setNombre('');
        setSeleccionado(null);
    };

    const handleNombre = (e) => {
        setNombre(e.target.value);
        setRut('');
        setSeleccionado(null);
    };

    useEffect(() => {
        const obtenerPersonas = async () => {
            try {
                const respuesta = await api.get('/persona');
                setPersonas(Array.isArray(respuesta.data) ? respuesta.data : []);
            } catch (err) {
                console.error('[FichaPaciente] Error personas:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo cargar la lista de pacientes.',
                });
            }
        };
        obtenerPersonas();
    }, []);

    useEffect(() => {
        const obtenerComunas = async () => {
            try {
                const respuesta = await api.get('/comuna/0');
                const lista = Array.isArray(respuesta.data) ? respuesta.data : [];
                lista.sort((a, b) => a.nombreComuna.localeCompare(b.nombreComuna));
                setComunas(lista);
            } catch (err) {
                console.error('[FichaPaciente] Error comunas:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo cargar la lista de comunas.',
                });
            }
        };
        obtenerComunas();
    }, []);

    const idPaciente = paciente?.idPersona;
    useEffect(() => {
        setContacto(null);
        setEditando(false);
        if (!idPaciente) return;

        let cancelado = false;
        const obtenerContacto = async () => {
            setCargandoContacto(true);
            try {
                const respuesta = await api.get(`/contactos/${idPaciente}`);
                if (!cancelado) {
                    setContacto(Array.isArray(respuesta.data) ? respuesta.data[0] : null);
                }
            } catch (err) {
                console.error('[FichaPaciente] Error contactos:', err);
                if (!cancelado) {
                    const detalle = err.response?.data?.detail;
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: typeof detalle === 'string'
                            ? detalle
                            : 'No se pudieron cargar los datos de contacto.',
                    });
                }
            } finally {
                if (!cancelado) setCargandoContacto(false);
            }
        };

        obtenerContacto();
        return () => {
            cancelado = true;
        };
    }, [idPaciente]);

    const telefonos = parsearTelefonos(contacto?.Contactos);
    const correos = separarLista(contacto?.Correos);

    const iniciarEdicion = () => {
        setFormEdicion({
            calle: contacto.calle || '',
            idComuna: paciente.idComuna ? String(paciente.idComuna) : '',
            telefonos:
                telefonos.length > 0
                    ? telefonos.map((t) => ({ numero: t.numero, tipo: t.tipo }))
                    : [{ numero: '', tipo: 'P' }],
            correos: correos.length > 0 ? correos : [''],
        });
        setErrores(erroresVacios);
        setEditando(true);
    };

    const cancelarEdicion = () => {
        setEditando(false);
        setErrores(erroresVacios);
    };

    const cambiarCampo = (e) => {
        const { name, value } = e.target;
        setFormEdicion({ ...formEdicion, [name]: value });
        setErrores({
            ...errores,
            [name]: name === 'calle' ? errorCalle(value) : errorComuna(value),
        });
    };

    const cambiarTelefono = (indice, campo, valor) => {
        const nuevaLista = formEdicion.telefonos.map((t, i) =>
            i === indice ? { ...t, [campo]: valor } : t
        );
        setFormEdicion({ ...formEdicion, telefonos: nuevaLista });
        setErrores({
            ...errores,
            telefonos: erroresTelefonos(nuevaLista, false),
            telefonosApi: '',
        });
    };

    const cambiarCorreo = (indice, valor) => {
        const nuevaLista = formEdicion.correos.map((v, i) => (i === indice ? valor : v));
        setFormEdicion({ ...formEdicion, correos: nuevaLista });
        setErrores({
            ...errores,
            correos: erroresCorreos(nuevaLista, false),
            correosApi: '',
        });
    };

    const agregarTelefono = () => {
        setFormEdicion({
            ...formEdicion,
            telefonos: [...formEdicion.telefonos, { numero: '', tipo: 'P' }],
        });
    };

    const quitarTelefono = (indice) => {
        const nuevaLista = formEdicion.telefonos.filter((_, i) => i !== indice);
        setFormEdicion({ ...formEdicion, telefonos: nuevaLista });
        setErrores({
            ...errores,
            telefonos: erroresTelefonos(nuevaLista, false),
            telefonosApi: '',
        });
    };

    const agregarCorreo = () => {
        setFormEdicion({ ...formEdicion, correos: [...formEdicion.correos, ''] });
    };

    const quitarCorreo = (indice) => {
        const nuevaLista = formEdicion.correos.filter((_, i) => i !== indice);
        setFormEdicion({ ...formEdicion, correos: nuevaLista });
        setErrores({
            ...errores,
            correos: erroresCorreos(nuevaLista, false),
            correosApi: '',
        });
    };

    const validar = () => {
        const nuevos = {
            calle: errorCalle(formEdicion.calle),
            idComuna: errorComuna(formEdicion.idComuna),
            telefonos: erroresTelefonos(formEdicion.telefonos, true),
            correos: erroresCorreos(formEdicion.correos, true),
        };

        const hayError =
            Boolean(nuevos.calle) ||
            Boolean(nuevos.idComuna) ||
            nuevos.telefonos.some(Boolean) ||
            nuevos.correos.some(Boolean);

        return { nuevos, hayError };
    };

    const armarCuerpo = () => ({
        calle: limpiarCalle(formEdicion.calle),
        idComuna: Number(formEdicion.idComuna),
        telefonos: formEdicion.telefonos.map((t) => ({
            numero: limpiarTelefono(t.numero),
            tipo: t.tipo,
        })),
        correos: formEdicion.correos.map(limpiarCorreo),
    });

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (guardando) return;

        const { nuevos, hayError } = validar();
        setErrores({ ...erroresVacios, ...nuevos });

        if (hayError) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Hay campos pendientes o con errores. Revise los marcados en rojo.',
            });
            return;
        }

        const cuerpo = armarCuerpo();
        setGuardando(true);

        try {
            const respuesta = await api.patch(`/contactos/${idPaciente}`, cuerpo);

            const actualizado = Array.isArray(respuesta.data) ? respuesta.data[0] : null;
            if (actualizado) setContacto(actualizado);

            setPersonas((anteriores) =>
                anteriores.map((p) =>
                    p.idPersona === idPaciente
                        ? { ...p, calle: cuerpo.calle, idComuna: cuerpo.idComuna }
                        : p
                )
            );

            setEditando(false);
            setErrores(erroresVacios);

            await Swal.fire({
                icon: 'success',
                title: 'Datos actualizados',
                text: 'Los datos de contacto se guardaron correctamente.',
            });
        } catch (err) {
            console.error('[FichaPaciente] Error al guardar:', err);

            const status = err.response?.status;
            const detalle = err.response?.data?.detail;

            if (!err.response) {
                Swal.fire({
                    icon: 'error',
                    title: 'Sin conexión',
                    text: 'No se pudo conectar con el servidor. Revise su conexión e intente de nuevo.',
                });
            } else if (status === 422 && Array.isArray(detalle)) {
                const nuevosApi = { ...erroresVacios };
                const sinUbicar = [];

                detalle.forEach((item) => {
                    const campo = item.loc?.[1];
                    const msg = quitarPrefijo(item.msg);

                    if (campo === 'calle' || campo === 'idComuna') {
                        nuevosApi[campo] = nuevosApi[campo] || msg;
                    } else if (campo === 'telefonos' || campo === 'correos') {
                        nuevosApi[`${campo}Api`] = nuevosApi[`${campo}Api`] || msg;
                    } else {
                        sinUbicar.push(msg);
                    }
                });

                setErrores(nuevosApi);
                Swal.fire({
                    icon: 'warning',
                    title: 'Datos rechazados',
                    text: sinUbicar.length > 0
                        ? sinUbicar.join(' ')
                        : 'El servidor rechazó algunos datos. Revise los campos marcados en rojo.',
                });
            } else if (status === 404) {
                Swal.fire({
                    icon: 'error',
                    title: 'Paciente no encontrado',
                    text: typeof detalle === 'string'
                        ? detalle
                        : 'No se encontró al paciente. Búsquelo nuevamente.',
                });
            } else if (status === 400) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Nada que guardar',
                    text: typeof detalle === 'string'
                        ? detalle
                        : 'Debe enviar al menos un campo para actualizar.',
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: typeof detalle === 'string'
                        ? detalle
                        : 'No se pudieron guardar los datos. Intente nuevamente.',
                });
            }
        } finally {
            setGuardando(false);
        }
    };

    // ---------- render de listas editables ----------

    const renderTelefonos = () => (
        <div style={{ marginBottom: '18px' }}>
            <label style={estiloEtiqueta}>Teléfonos (*):</label>

            {formEdicion.telefonos.map((item, i) => (
                <div key={i} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <input
                            type="text"
                            placeholder="Ej: 912345678"
                            value={item.numero}
                            onChange={(e) => cambiarTelefono(i, 'numero', e.target.value)}
                            style={estiloCampo(Boolean(errores.telefonos[i]))}
                        />
                        <select
                            value={item.tipo}
                            onChange={(e) => cambiarTelefono(i, 'tipo', e.target.value)}
                            style={{
                                minWidth: '150px',
                                ...(item.tipo === 'E'
                                    ? { borderColor: 'var(--error-text)' }
                                    : {}),
                            }}
                        >
                            <option value="P">Personal</option>
                            <option value="E">Emergencia</option>
                        </select>
                        <button
                            type="button"
                            className="btn-peligro"
                            style={btnPeligro}
                            disabled={formEdicion.telefonos.length === 1}
                            onClick={() => quitarTelefono(i)}
                        >
                            Quitar
                        </button>
                    </div>
                    {errores.telefonos[i] && (
                        <small className="texto-error" style={estiloMensaje}>
                            {errores.telefonos[i]}
                        </small>
                    )}
                </div>
            ))}

            {formEdicion.telefonos.length < MAX_TELEFONOS && (
                <button type="button" style={btnSecundario} onClick={agregarTelefono}>
                    + Agregar otro teléfono
                </button>
            )}

            {errores.telefonosApi && (
                <small className="texto-error" style={estiloMensaje}>
                    {errores.telefonosApi}
                </small>
            )}
        </div>
    );

    const renderCorreos = () => (
        <div style={{ marginBottom: '18px' }}>
            <label style={estiloEtiqueta}>Correos (*):</label>

            {formEdicion.correos.map((valor, i) => (
                <div key={i} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            placeholder="Ej: nombre@dominio.cl"
                            value={valor}
                            onChange={(e) => cambiarCorreo(i, e.target.value)}
                            style={estiloCampo(Boolean(errores.correos[i]))}
                        />
                        <button
                            type="button"
                            className="btn-peligro"
                            style={btnPeligro}
                            disabled={formEdicion.correos.length === 1}
                            onClick={() => quitarCorreo(i)}
                        >
                            Quitar
                        </button>
                    </div>
                    {errores.correos[i] && (
                        <small className="texto-error" style={estiloMensaje}>
                            {errores.correos[i]}
                        </small>
                    )}
                </div>
            ))}

            {formEdicion.correos.length < MAX_CORREOS && (
                <button type="button" style={btnSecundario} onClick={agregarCorreo}>
                    + Agregar otro correo
                </button>
            )}

            {errores.correosApi && (
                <small className="texto-error" style={estiloMensaje}>
                    {errores.correosApi}
                </small>
            )}
        </div>
    );

    return (
        <div
            style={{
                width: '100%',
                maxWidth: '900px',
                margin: '40px auto',
                padding: '20px',
                boxSizing: 'border-box',
            }}
        >
            <header style={{ textAlign: 'left', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>Ficha del paciente</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                    Busque al paciente por su RUT o nombre para ver y editar sus datos de contacto.
                </p>
            </header>

            {/* Card de búsqueda */}
            <div style={estiloCard}>
                <h3 style={{ margin: '0 0 12px', color: 'var(--text-h)', fontSize: '16px' }}>
                    Buscar paciente
                </h3>

                <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                        <label style={estiloEtiqueta}>RUT del Paciente</label>
                        <input
                            type="text"
                            placeholder="Ej: 12345678-9"
                            value={rut}
                            onChange={handleRut}
                            disabled={guardando}
                            style={estiloCampo(Boolean(mensajeRut))}
                        />
                        {mensajeRut && (
                            <small className="texto-error" style={estiloMensaje}>
                                {mensajeRut}
                            </small>
                        )}
                    </div>

                    <div>
                        <label style={estiloEtiqueta}>O busque por nombre</label>
                        <input
                            type="text"
                            placeholder="Ej: Juan Pérez"
                            value={nombre}
                            onChange={handleNombre}
                            disabled={guardando}
                            style={estiloCampo(Boolean(mensajeNombre))}
                        />
                        {mensajeNombre && (
                            <small className="texto-error" style={estiloMensaje}>
                                {mensajeNombre}
                            </small>
                        )}
                    </div>
                </div>

                {!seleccionado && coincidencias.length > 0 && (
                    <ul
                        style={{
                            listStyle: 'none',
                            padding: 0,
                            margin: '16px 0 0',
                            display: 'grid',
                            gap: '6px',
                        }}
                    >
                        {coincidencias.slice(0, 8).map((p) => (
                            <li key={p.idPersona}>
                                <button
                                    type="button"
                                    onClick={() => setSeleccionado(p)}
                                    style={{
                                        ...btnSecundario,
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '10px 14px',
                                    }}
                                >
                                    <strong style={{ color: 'var(--text-h)' }}>
                                        {p.nombrePersona}
                                    </strong>{' '}
                                    <span style={{ color: 'var(--text-muted)' }}>
                                        ({p.rut}-{p.dv})
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Card del paciente */}
            {paciente && (
                <div style={estiloCard}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px',
                            marginBottom: '16px',
                        }}
                    >
                        <div>
                            <h3 style={{ margin: 0, color: 'var(--text-h)', fontSize: '18px' }}>
                                {paciente.nombrePersona}
                            </h3>
                            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                                RUT: {paciente.rut}-{paciente.dv}
                            </span>
                        </div>
                        <span style={badge}>Paciente</span>
                    </div>

                    {cargandoContacto && (
                        <p style={{ color: 'var(--text-muted)' }}>Cargando datos de contacto...</p>
                    )}

                    {/* modo lectura */}
                    {contacto && !editando && (
                        <>
                            <div style={estiloFilaDato}>
                                <span style={{ ...estiloEtiqueta, marginBottom: 0 }}>Dirección</span>
                                <span style={estiloValor}>
                                    {contacto.calle || 'No registrada'}
                                </span>
                            </div>

                            <div style={estiloFilaDato}>
                                <span style={{ ...estiloEtiqueta, marginBottom: 0 }}>Comuna</span>
                                <span style={estiloValor}>
                                    {contacto.Comuna
                                        ? `${contacto.Comuna}${contacto.Region ? ` (${contacto.Region})` : ''}`
                                        : 'No registrada'}
                                </span>
                            </div>

                            <div style={estiloFilaDato}>
                                <span style={{ ...estiloEtiqueta, marginBottom: 0 }}>Teléfonos</span>
                                {telefonos.length > 0 ? (
                                    <ul
                                        style={{
                                            listStyle: 'none',
                                            margin: '6px 0 0',
                                            padding: 0,
                                            display: 'grid',
                                            gap: '8px',
                                        }}
                                    >
                                        {telefonos.map((t, i) => (
                                            <li
                                                key={`${t.numero}-${i}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: '10px',
                                                    padding: '8px 12px',
                                                    background: 'var(--surface-alt)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '8px',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        color: 'var(--text-h)',
                                                        fontWeight: '600',
                                                        letterSpacing: '0.3px',
                                                    }}
                                                >
                                                    {t.numero}
                                                </span>
                                                <span style={badgeTipo(t.tipo)}>
                                                    {nombreTipoTelefono(t.tipo)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>No registrados</span>
                                )}
                            </div>

                            <div style={estiloFilaDatoUltima}>
                                <span style={{ ...estiloEtiqueta, marginBottom: 0 }}>Correos</span>
                                {correos.length > 0 ? (
                                    <ul
                                        style={{
                                            margin: '4px 0 0',
                                            paddingLeft: '20px',
                                            color: 'var(--text-h)',
                                        }}
                                    >
                                        {correos.map((c) => (
                                            <li key={c}>{c}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>No registrados</span>
                                )}
                            </div>

                            <div style={{ marginTop: '20px' }}>
                                <button
                                    type="button"
                                    style={btnPrimario}
                                    onClick={iniciarEdicion}
                                >
                                    Editar datos de contacto
                                </button>
                            </div>
                        </>
                    )}

                    {/* modo edición */}
                    {contacto && editando && (
                        <form onSubmit={handleGuardar} noValidate>
                            <div style={{ marginBottom: '18px' }}>
                                <label style={estiloEtiqueta}>Dirección (*)</label>
                                <input
                                    type="text"
                                    name="calle"
                                    value={formEdicion.calle}
                                    onChange={cambiarCampo}
                                    style={estiloCampo(Boolean(errores.calle))}
                                />
                                {errores.calle && (
                                    <small className="texto-error" style={estiloMensaje}>
                                        {errores.calle}
                                    </small>
                                )}
                            </div>

                            <div style={{ marginBottom: '18px' }}>
                                <label style={estiloEtiqueta}>Comuna (*)</label>
                                <select
                                    name="idComuna"
                                    value={formEdicion.idComuna}
                                    onChange={cambiarCampo}
                                    disabled={comunas.length === 0}
                                    style={estiloCampo(Boolean(errores.idComuna))}
                                >
                                    <option value="">
                                        {comunas.length === 0
                                            ? 'Cargando comunas...'
                                            : 'Seleccione una comuna'}
                                    </option>
                                    {comunas.map((c) => (
                                        <option key={c.idComuna} value={c.idComuna}>
                                            {c.nombreComuna}
                                        </option>
                                    ))}
                                </select>
                                {errores.idComuna && (
                                    <small className="texto-error" style={estiloMensaje}>
                                        {errores.idComuna}
                                    </small>
                                )}
                            </div>

                            {renderTelefonos()}
                            {renderCorreos()}

                            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                <button
                                    type="submit"
                                    disabled={guardando}
                                    style={btnPrimario}
                                >
                                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                                <button
                                    type="button"
                                    onClick={cancelarEdicion}
                                    disabled={guardando}
                                    style={btnSecundario}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}