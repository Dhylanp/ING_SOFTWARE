import { useState } from 'react';
import TablaInterconsultas from '../components/TablaInterconsultas';

export function App() {
  // estado local para guardar lo que el usuario escribe en los campos del formulario
  const [formData, setFormData] = useState({
    pacienteRut: '',
    especialidadDestino: '',
    prioridadClinica: 'Media',
    motivoDerivacion: '',
  });

  // estados para mostrar mensajes de confirmacion o error en pantalla
  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');

  // pestanas
  const [pestanaActiva, setPestanaActiva] = useState('registro');

  // manejador que se ejecuta cada vez que el usuario escribe un campo
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // manejador del envio del formulario
  const handleSubmit = async (e) => {
    // evita que la pagina se recargue al enviar el formulario
    e.preventDefault();
    setMensajeExito('');
    setMensajeError('');

    // validacion local basica
    if (!formData.pacienteRut || !formData.especialidadDestino || !formData.motivoDerivacion) {
      setMensajeError('Todos los campos marcados con (*) son obligatorios.');
      return;
    }

    try {
      // peticion POST al backend en node.js
      const response = await fetch('http://localhost:5000/api/interconsultas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar la solicitud');
      }

      setMensajeExito(`Exito! Intercosulta #${data.data.id} registrada con estado: "${data.data.estado}".`);

      // limpia las casillas del formulario
      setFormData({
        pacienteRut: '',
        especialidadDestino: '',
        prioridadClinica: 'Media',
        motivoDerivacion: '',
      });
    } catch (err) {
      setMensajeError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', fontFamily: 'Arial, sans-serif', padding: '20px' }}>

      {/* botones tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #ccc', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setPestanaActiva('registro')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: pestanaActiva === 'registro' ? '3px solid #0d6efd' : '3px solid transparent',
            backgroundColor: pestanaActiva === 'registro' ? '#2b3035' : 'transparent',
            fontWeight: pestanaActiva === 'registro' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          HU01A - Registrar interconsulta
        </button>

        <button
          type="button"
          onClick={() => setPestanaActiva('listado')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: pestanaActiva === 'listado' ? '3px solid #0d6efd' : '3px solid transparent',
            backgroundColor: pestanaActiva === 'listado' ? '#2b3035' : 'transparent',
            fontWeight: pestanaActiva === 'listado' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          HU02 - Listado de interconsultas
        </button>
      </div>

      {pestanaActiva === 'registro' ? (
        <div>
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
            {/* Campo rut del paciente */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Rut Paciente (*):</label>
              <input
                type="text"
                name="pacienteRut"
                placeholder="Ej: 12345678-9"
                value={formData.pacienteRut}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </div>

            {/* campo especialidad de destino */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Especialidad de Destino (*):</label>
              <input
                type="text"
                name="especialidadDestino"
                placeholder="Ej: Cardiología"
                value={formData.especialidadDestino}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </div>

            {/* selector de prioridad clinica */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Prioridad Clínica (*):</label>
              <select
                name="prioridadClinica"
                value={formData.prioridadClinica}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              >
                <option value="Baja">Baja</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
              </select>
            </div>

            {/* motivo de derivacion */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Motivo de Derivación (*):</label>
              <textarea
                name="motivoDerivacion"
                rows="4"
                placeholder="Describa brevemente el motivo clínico..."
                value={formData.motivoDerivacion}
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
      ) : (
        <TablaInterconsultas />
      )}

    </div>
  );
}

export default App;