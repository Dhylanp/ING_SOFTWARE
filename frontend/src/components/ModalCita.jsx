import { useState } from 'react';
import Modal from './Modal';
import { hoyISO } from '../lib/fechas';

// HU17: fecha, hora y centro de la hora médica que se avisará al paciente.
export default function ModalCita({ abierto, onCerrar, onConfirmar, centroSugerido = '', enviando = false }) {
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [centro, setCentro] = useState(centroSugerido);
  const [errores, setErrores] = useState({});

  const cerrar = () => {
    setFecha('');
    setHora('');
    setErrores({});
    onCerrar();
  };

  const confirmar = () => {
    const nuevos = {};
    if (!fecha) nuevos.fecha = 'Indique la fecha de la cita.';
    else if (fecha < hoyISO()) nuevos.fecha = 'La fecha no puede ser anterior a hoy.';
    if (!hora) nuevos.hora = 'Indique la hora de la cita.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    onConfirmar({ fecha, hora, centro: centro.trim() });
  };

  const campo = (hayError) => ({ width: '100%', ...(hayError ? { border: '1px solid var(--danger)' } : {}) });

  return (
    <Modal abierto={abierto} titulo="Asignar hora médica" onCerrar={cerrar}>
      <label htmlFor="cita-fecha" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Fecha (*):</label>
      <input id="cita-fecha" type="date" min={hoyISO()} value={fecha} onChange={(e) => setFecha(e.target.value)} style={campo(errores.fecha)} />
      {errores.fecha && <small role="alert" className="texto-error">{errores.fecha}</small>}

      <label htmlFor="cita-hora" style={{ display: 'block', fontWeight: 'bold', margin: '12px 0 5px' }}>Hora (*):</label>
      <input id="cita-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} style={campo(errores.hora)} />
      {errores.hora && <small role="alert" className="texto-error">{errores.hora}</small>}

      <label htmlFor="cita-centro" style={{ display: 'block', fontWeight: 'bold', margin: '12px 0 5px' }}>Centro médico:</label>
      <input id="cita-centro" type="text" maxLength={120} value={centro} onChange={(e) => setCentro(e.target.value)} style={{ width: '100%' }} />

      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '10px' }}>
        Se enviará un correo al paciente con la fecha, la hora y el centro.
      </p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button type="button" onClick={cerrar} disabled={enviando} className="btn-secundario">Cancelar</button>
        <button type="button" onClick={confirmar} disabled={enviando}>{enviando ? 'Asignando...' : 'Asignar hora'}</button>
      </div>
    </Modal>
  );
}
