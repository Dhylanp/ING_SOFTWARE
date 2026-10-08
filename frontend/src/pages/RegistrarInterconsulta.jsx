import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const formularioVacio = {
    rut: '',
    idCesfam: '',
    idHospital: '',
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
    const [cargandoHospitales, setCargandoHospitales] = useState(false);

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
                const respuesta = await api.get('/persona');
                setPersonas(Array.isArray(respuesta.data) ? respuesta.data : []);
            } catch (err) {
                console.error('[RegistrarInterconsulta] Error personas:', err);
                Swal.fire({
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

                const respuesta = await api.get(url);
                console.log('[RegistrarInterconsulta] Status:', respuesta.status);
                console.log('[RegistrarInterconsulta] Data hospitales:', respuesta.data);

                const lista = Array.isArray(respuesta.data) ? respuesta.data : [];
                setHospitales(lista);
            } catch (err) {
                console.error('[RegistrarInterconsulta] Error hospitales:', err);
                console.error('[RegistrarInterconsulta] Response:', err.response);
                console.error('[RegistrarInterconsulta] Message:', err.message);

                let texto;
                if (err.response) {
                    texto = `Error del servidor (${err.response.status}): ${
                        typeof err.response.data?.detail === 'string'
                            ? err.response.data.detail
                            : 'No se pudo cargar la lista de hospitales.'
                    }`;
                } else if (err.request) {
                    texto = 'No hubo respuesta del servidor. Verifique la URL del backend y CORS.';
                } else {
                    texto = 'Error al configurar la petición: ' + err.message;
                }

                Swal.fire({
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

        if (!formData.descripcion.trim()) {
            nuevos.descripcion = 'Escriba el motivo de la derivación.';
        }

        return nuevos;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const nuevos = validar();
        setErrores(nuevos);

        // si hay errores no se envía nada
        if (Object.keys(nuevos).length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Hay campos pendientes o con errores. Revise los marcados en rojo.'
            });
            return;
        }

        try {
            const respuesta = await api.post('/formulario', {
                descripcion: formData.descripcion.trim(),
                fechaInicio: new Date().toLocaleDateString('en-CA'),
                idPersona: Number(paciente.idPersona),
                idCesfam: Number(idCesfamFinal),
                idHospital: Number(formData.idHospital),
                prioridad: formData.prioridad,
            });

            setFormData(formularioVacio);
            setErrores({});

            Swal.fire({
                icon: 'success',
                title: 'Interconsulta registrada',
                text: respuesta.data.mensaje || 'La interconsulta fue registrada correctamente.'
            });
        } catch (err) {
            const detalle = err.response?.data?.detail;

            Swal.fire({
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
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>RUT del Paciente (*):</label>
                    <input
                        type="text"
                        name="rut"
                        placeholder="Ej: 12345678-9"
                        value={formData.rut}
                        onChange={handleChange}
                        style={estiloCampo(Boolean(mensajeRut))}
                    />
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
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Hospital de Destino (*):</label>
                    <select
                        name="idHospital"
                        value={formData.idHospital}
                        onChange={handleChange}
                        disabled={cargandoHospitales}
                        style={estiloCampo(Boolean(errores.idHospital))}
                    >
                        <option value="">
                            {cargandoHospitales ? 'Cargando hospitales...' : 'Seleccione un hospital'}
                        </option>
                        {hospitales.map((h) => (
                            <option key={h.idHospital} value={h.idHospital}>
                                {h.nombreHospital}
                            </option>
                        ))}
                    </select>
                    {errores.idHospital && (
                        <small className="texto-error" style={estiloMensaje}>
                            {errores.idHospital}
                        </small>
                    )}
                    {!cargandoHospitales && hospitales.length === 0 && (
                        <small className="texto-error" style={estiloMensaje}>
                            No hay hospitales disponibles.
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
            </form>
        </div>
    );
}