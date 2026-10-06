import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../api/axios';

// mismas reglas que la API (DATA/main.py); los largos de calle son provisorios
const TEL_REGEX = /^9\d{8}$/;
const CORREO_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CORREO_MAX = 50;
const CALLE_MIN = 3;
const CALLE_MAX = 50;
const MAX_TELEFONOS = 5;
const MAX_CORREOS = 5;

// borde rojo cuando el campo tiene un error
const estiloCampo = (hayError) => ({
    width: '100%',
    ...(hayError ? { border: '1px solid var(--danger)' } : {}),
});

// mensaje de error bajo un campo
const estiloMensaje = { display: 'block', marginTop: '4px' };

// estilo de cada dato de la ficha
const estiloEtiqueta = { display: 'block', fontWeight: 'bold', marginBottom: '5px' };

// los teléfonos y correos vienen como texto separado por ";" (o null si no hay)
const separarLista = (texto) =>
    texto ? texto.split(';').map((t) => t.trim()).filter(Boolean) : [];

// deja el teléfono como lo deja la API: sin espacios, guiones ni +56
const limpiarTelefono = (texto) => {
    let t = texto.replace(/[\s\-()]/g, '');
    if (t.startsWith('+56')) t = t.slice(3);
    else if (t.startsWith('56') && t.length === 11) t = t.slice(2);
    return t;
};

const limpiarCorreo = (texto) => texto.trim().toLowerCase();

// quita espacios sobrantes de la calle
const limpiarCalle = (texto) => texto.split(/\s+/).filter(Boolean).join(' ');

const erroresVacios = { calle: '', idComuna: '', telefonos: [], correos: [] };

// ---------- validaciones por campo ----------
// cada una devuelve el mensaje de error, o '' si el valor está bien

const errorCalle = (texto) => {
    const calle = limpiarCalle(texto);
    return calle.length < CALLE_MIN || calle.length > CALLE_MAX
        ? `La calle debe tener entre ${CALLE_MIN} y ${CALLE_MAX} caracteres.`
        : '';
};

const errorComuna = (valor) => (valor ? '' : 'Seleccione una comuna.');

// devuelven un mensaje por cada fila de la lista.
// Mientras escribe (exigirLleno = false) las filas vacías no marcan error,
// porque aún no las escribió; al guardar (true) sí.
const erroresTelefonos = (lista, exigirLleno) => {
    const vistos = [];
    return lista.map((texto) => {
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

    const [comunas, setComunas] = useState([]);
    const [editando, setEditando] = useState(false);
    const [formEdicion, setFormEdicion] = useState({
        calle: '',
        idComuna: '',
        telefonos: [''],
        correos: [''],
    });
    const [errores, setErrores] = useState(erroresVacios);

    // busca al paciente por RUT (ignora puntos y espacios)
    const rutLimpio = rut.replace(/[.\s]/g, '').toLowerCase();
    const rutListo = /^\d{7,8}-[\dk]$/.test(rutLimpio);
    const paciente = rutListo
        ? personas.find((p) => {
            const [rutTexto, dv] = rutLimpio.split('-');
            return String(p.rut) === rutTexto && String(p.dv).toLowerCase() === dv;
        }) || null
        : null;

    // mensaje bajo el RUT
    let mensajeRut = '';
    if (rut.trim() && !rutListo) {
        mensajeRut = 'El RUT debe tener el formato 12345678-9.';
    } else if (rutListo && !paciente && personas.length > 0) {
        mensajeRut = 'No se encontró un paciente con ese RUT.';
    }

    // carga la lista de personas al abrir la pantalla
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
                    text: 'No se pudo cargar la lista de pacientes.'
                });
            }
        };

        obtenerPersonas();
    }, []);

    // carga todas las comunas (0 = sin filtrar por región) para el selector
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
                    text: 'No se pudo cargar la lista de comunas.'
                });
            }
        };

        obtenerComunas();
    }, []);

    // cuando cambia el paciente, sale del modo edición y carga sus datos de contacto
    const idPaciente = paciente?.idPersona;
    useEffect(() => {
        setContacto(null);
        setEditando(false);
        if (!idPaciente) return;

        let cancelado = false; // evita mostrar datos de un paciente anterior
        const obtenerContacto = async () => {
            setCargandoContacto(true);
            try {
                const respuesta = await api.get(`/contactos/${idPaciente}`);
                if (!cancelado) {
                    // la API responde una lista con un solo objeto
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
                            : 'No se pudieron cargar los datos de contacto.'
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

    const telefonos = separarLista(contacto?.Contactos);
    const correos = separarLista(contacto?.Correos);

    // ---------- edición ----------

    // abre el formulario con los datos actuales del paciente
    const iniciarEdicion = () => {
        setFormEdicion({
            calle: contacto.calle || '',
            idComuna: paciente.idComuna ? String(paciente.idComuna) : '',
            telefonos: telefonos.length > 0 ? telefonos : [''],
            correos: correos.length > 0 ? correos : [''],
        });
        setErrores(erroresVacios);
        setEditando(true);
    };

    const cancelarEdicion = () => {
        setEditando(false);
        setErrores(erroresVacios);
    };

    // cambio de calle o comuna: se valida mientras escribe
    const cambiarCampo = (e) => {
        const { name, value } = e.target;
        setFormEdicion({ ...formEdicion, [name]: value });
        setErrores({
            ...errores,
            [name]: name === 'calle' ? errorCalle(value) : errorComuna(value),
        });
    };

    // calcula los errores de una lista ('telefonos' o 'correos')
    const erroresDeLista = (clave, lista, exigirLleno) =>
        clave === 'telefonos'
            ? erroresTelefonos(lista, exigirLleno)
            : erroresCorreos(lista, exigirLleno);

    // cambio en una fila de la lista: se valida toda la lista (por los repetidos)
    const cambiarItem = (clave, indice, valor) => {
        const nuevaLista = formEdicion[clave].map((v, i) => (i === indice ? valor : v));
        setFormEdicion({ ...formEdicion, [clave]: nuevaLista });
        setErrores({ ...errores, [clave]: erroresDeLista(clave, nuevaLista, false) });
    };

    const agregarItem = (clave) => {
        setFormEdicion({ ...formEdicion, [clave]: [...formEdicion[clave], ''] });
    };

    const quitarItem = (clave, indice) => {
        const nuevaLista = formEdicion[clave].filter((_, i) => i !== indice);
        setFormEdicion({ ...formEdicion, [clave]: nuevaLista });
        setErrores({ ...errores, [clave]: erroresDeLista(clave, nuevaLista, false) });
    };

    // revisión completa al guardar (aquí sí se exigen las filas vacías)
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

    // cuerpo listo para el PATCH (ya limpio, igual que lo deja la API)
    const armarCuerpo = () => ({
        calle: limpiarCalle(formEdicion.calle),
        idComuna: Number(formEdicion.idComuna),
        telefonos: formEdicion.telefonos.map(limpiarTelefono),
        correos: formEdicion.correos.map(limpiarCorreo),
    });

    const handleGuardar = (e) => {
        e.preventDefault();

        const { nuevos, hayError } = validar();
        setErrores(nuevos);

        // si hay errores no se envía nada
        if (hayError) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Hay campos pendientes o con errores. Revise los marcados en rojo.'
            });
            return;
        }

        // TEMPORAL (paso 2): todavía no se guarda, el PATCH viene en el paso 3
        console.log('[FichaPaciente] Cuerpo para el PATCH:', armarCuerpo());
        Swal.fire({
            icon: 'info',
            title: 'Validación correcta',
            text: 'Los datos son válidos. El guardado se agrega en el siguiente paso.'
        });
    };

    // dibuja una lista editable (teléfonos o correos)
    const renderLista = (clave, etiqueta, maximo, placeholder) => (
        <div style={{ marginBottom: '15px' }}>
            <label style={estiloEtiqueta}>{etiqueta} (*):</label>

            {formEdicion[clave].map((valor, i) => (
                <div key={i} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            placeholder={placeholder}
                            value={valor}
                            onChange={(e) => cambiarItem(clave, i, e.target.value)}
                            style={estiloCampo(Boolean(errores[clave][i]))}
                        />
                        <button
                            type="button"
                            className="btn-peligro"
                            disabled={formEdicion[clave].length === 1}
                            onClick={() => quitarItem(clave, i)}
                        >
                            Quitar
                        </button>
                    </div>
                    {errores[clave][i] && (
                        <small className="texto-error" style={estiloMensaje}>
                            {errores[clave][i]}
                        </small>
                    )}
                </div>
            ))}

            {formEdicion[clave].length < maximo && (
                <button type="button" onClick={() => agregarItem(clave)}>
                    Agregar otro
                </button>
            )}
        </div>
    );

    return (
        <div style={{ width: '100%', maxWidth: '900px', margin: '40px auto', padding: '20px', boxSizing: 'border-box' }}>

            <h2>Ficha del paciente</h2>
            <p style={{ color: 'var(--text-muted)' }}>
                Busque al paciente por su RUT para ver sus datos de contacto.
            </p>

            {/* rut del paciente */}
            <div style={{ marginBottom: '15px' }}>
                <label style={estiloEtiqueta}>RUT del Paciente:</label>
                <input
                    type="text"
                    placeholder="Ej: 12345678-9"
                    value={rut}
                    onChange={(e) => setRut(e.target.value)}
                    style={estiloCampo(Boolean(mensajeRut))}
                />
                {mensajeRut && (
                    <small className="texto-error" style={estiloMensaje}>
                        {mensajeRut}
                    </small>
                )}
            </div>

            {/* datos del paciente encontrado */}
            {paciente && (
                <div>
                    <div style={{ marginBottom: '15px' }}>
                        <span style={estiloEtiqueta}>Nombre:</span>
                        {paciente.nombrePersona}
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <span style={estiloEtiqueta}>RUT:</span>
                        {paciente.rut}-{paciente.dv}
                    </div>

                    {cargandoContacto && (
                        <p style={{ color: 'var(--text-muted)' }}>Cargando datos de contacto...</p>
                    )}

                    {/* modo lectura */}
                    {contacto && !editando && (
                        <>
                            <div style={{ marginBottom: '15px' }}>
                                <span style={estiloEtiqueta}>Dirección:</span>
                                {contacto.calle || 'No registrada'}
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <span style={estiloEtiqueta}>Comuna:</span>
                                {contacto.Comuna
                                    ? `${contacto.Comuna}${contacto.Region ? ` (${contacto.Region})` : ''}`
                                    : 'No registrada'}
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <span style={estiloEtiqueta}>Teléfonos:</span>
                                {telefonos.length > 0 ? (
                                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                        {telefonos.map((t) => (
                                            <li key={t}>{t}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    'No registrados'
                                )}
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <span style={estiloEtiqueta}>Correos:</span>
                                {correos.length > 0 ? (
                                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                        {correos.map((c) => (
                                            <li key={c}>{c}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    'No registrados'
                                )}
                            </div>

                            <button
                                type="button"
                                style={{ padding: '10px 20px', fontWeight: 'bold' }}
                                onClick={iniciarEdicion}
                            >
                                Editar
                            </button>
                        </>
                    )}

                    {/* modo edición */}
                    {contacto && editando && (
                        <form onSubmit={handleGuardar} noValidate>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={estiloEtiqueta}>Dirección (*):</label>
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

                            <div style={{ marginBottom: '15px' }}>
                                <label style={estiloEtiqueta}>Comuna (*):</label>
                                <select
                                    name="idComuna"
                                    value={formEdicion.idComuna}
                                    onChange={cambiarCampo}
                                    disabled={comunas.length === 0}
                                    style={estiloCampo(Boolean(errores.idComuna))}
                                >
                                    <option value="">
                                        {comunas.length === 0 ? 'Cargando comunas...' : 'Seleccione una comuna'}
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

                            {renderLista('telefonos', 'Teléfonos', MAX_TELEFONOS, 'Ej: 912345678')}
                            {renderLista('correos', 'Correos', MAX_CORREOS, 'Ej: nombre@dominio.cl')}

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    type="submit"
                                    style={{ padding: '10px 20px', fontWeight: 'bold' }}
                                >
                                    Guardar cambios
                                </button>
                                <button type="button" onClick={cancelarEdicion}>
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