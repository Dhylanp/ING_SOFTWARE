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

    const [mensajeExito, setMensajeExito] = useState('');
    const [mensajeError, setMensajeError] = useState('');

    // carga la lista de hospitales al abrir la pantalla
    useEffect(() => {
        const obtenerHospitales = async () => {
            try {
                const respuesta = await api.get('/hospital/0');
                setHospitales(respuesta.data);
            } catch (err) {
                setMensajeError('No se pudo cargar la lista de hospitales.');
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
        <div style={{ maxWidth: '900px', margin: '40px auto', fontFamily: 'Arial, sans-serif', padding: '20px' }}>

            <h2>HU01A - Registrar Interconsulta (Atención Primaria)</h2>
            <p style={{ color: '#555' }}>Ingrese los datos básicos para tramitar la derivación del paciente.</p>

            {/* alerta de éxito */}
            {mensajeExito && (
                <div style={{ padding: '10px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px', marginBottom: '15px' }}>
                    {mensajeExito}
                </div>
            )}

            {/* alerta de error */}
            {mensajeError && (
                <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '15px' }}>
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
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
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
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>

                {/* selector de hospital de destino */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Hospital de Destino (*):</label>
                    <select
                        name="idHospital"
                        value={formData.idHospital}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    >
                        <option value="">Seleccione un hospital</option>
                        {hospitales.map((h) => (
                            <option key={h.idHospital} value={h.idHospital}>
                                {h.nombreHospital}
                            </option>
                        ))}
                    </select>
                </div>

                {/* selector de prioridad clinica */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Prioridad Clínica (*):</label>
                    <select
                        name="prioridad"
                        value={formData.prioridad}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
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
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>

                {/* boton de envio */}
                <button
                    type="submit"
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#0056b3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    Guardar y emitir interconsulta
                </button>
            </form>
        </div>
    );
}