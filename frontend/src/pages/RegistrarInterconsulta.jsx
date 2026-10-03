import { useState, useEffect } from 'react';
import api from '../api/axios';

const formularioVacio = {
    idPersona: '',
    idCesfam: '',
    idHospital: '',
    prioridad: '2',
    descripcion: '',
};

export default function RegistrarInterconsulta() {
    const [formData, setFormData] = useState(formularioVacio);
    const [hospitales, setHospitales] = useState([]);
    const [cargandoHospitales, setCargandoHospitales] = useState(false);

    const [mensajeExito, setMensajeExito] = useState('');
    const [mensajeError, setMensajeError] = useState('');

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

                if (lista.length === 0) {
                    setMensajeError('El servidor no devolvió hospitales. Verifique que la tabla "hospital" tenga datos.');
                }
            } catch (err) {
                console.error('[RegistrarInterconsulta] Error hospitales:', err);
                console.error('[RegistrarInterconsulta] Response:', err.response);
                console.error('[RegistrarInterconsulta] Message:', err.message);

                if (err.response) {
                    setMensajeError(
                        `Error del servidor (${err.response.status}): ${
                            typeof err.response.data?.detail === 'string'
                                ? err.response.data.detail
                                : 'No se pudo cargar la lista de hospitales.'
                        }`
                    );
                } else if (err.request) {
                    setMensajeError('No hubo respuesta del servidor. Verifique la URL del backend y CORS.');
                } else {
                    setMensajeError('Error al configurar la petición: ' + err.message);
                }
            } finally {
                setCargandoHospitales(false);
            }
        };

        obtenerHospitales();
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMensajeExito('');
        setMensajeError('');

        if (!formData.idPersona || !formData.idCesfam || !formData.idHospital || !formData.descripcion) {
            setMensajeError('Todos los campos marcados con (*) son obligatorios.');
            return;
        }

        try {
            const respuesta = await api.post('/formulario', {
                descripcion: formData.descripcion,
                fechaInicio: new Date().toLocaleDateString('en-CA'),
                idPersona: Number(formData.idPersona),
                idCesfam: Number(formData.idCesfam),
                idHospital: Number(formData.idHospital),
                prioridad: formData.prioridad,
            });

            setMensajeExito(respuesta.data.mensaje);
            setFormData(formularioVacio);
        } catch (err) {
            const detalle = err.response?.data?.detail;
            setMensajeError(typeof detalle === 'string' ? detalle : 'Error al procesar la solicitud');
        }
    };

    return (
        <div style={{ width: '100%', maxWidth: '900px', margin: '40px auto', fontFamily: 'Arial, sans-serif', padding: '20px', boxSizing: 'border-box' }}>

            <h2>HU01A - Registrar Interconsulta (Atención Primaria)</h2>
            <p style={{ color: 'var(--text-muted)' }}>Ingrese los datos básicos para tramitar la derivación del paciente.</p>

            {/* alerta de éxito */}
            {mensajeExito && (
                <div style={{ padding: '10px', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', borderRadius: '4px', marginBottom: '15px' }}>
                    {mensajeExito}
                </div>
            )}

            {/* alerta de error */}
            {mensajeError && (
                <div style={{ padding: '10px', backgroundColor: 'var(--error-bg)', color: 'var(--error-text)', borderRadius: '4px', marginBottom: '15px' }}>
                    {mensajeError}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* id del paciente (temporal) */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>ID Paciente (*):</label>
                    <input
                        type="number"
                        name="idPersona"
                        placeholder="Ej: 1"
                        value={formData.idPersona}
                        onChange={handleChange}
                        style={{ width: '100%' }}
                    />
                </div>

                {/* id del cesfam (temporal) */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>ID CESFAM (*):</label>
                    <input
                        type="number"
                        name="idCesfam"
                        placeholder="Ej: 5"
                        value={formData.idCesfam}
                        onChange={handleChange}
                        style={{ width: '100%' }}
                    />
                </div>

                {/* selector de hospital de destino */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Hospital de Destino (*):</label>
                    <select
                        name="idHospital"
                        value={formData.idHospital}
                        onChange={handleChange}
                        disabled={cargandoHospitales}
                        style={{ width: '100%' }}
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
                    {!cargandoHospitales && hospitales.length === 0 && (
                        <small className="texto-error">
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
                        placeholder="Describa brevemente el motivo clínico..."
                        value={formData.descripcion}
                        onChange={handleChange}
                        style={{ width: '100%' }}
                    />
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