import { useState } from 'react';
import Modal from './Modal';

// HU23: devolver exige indicar el motivo.
export default function ModalDevolucion({ abierto, onCerrar, onConfirmar, enviando = false }) {
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');

  const cerrar = () => {
    setMotivo('');
    setObservaciones('');
    setError('');
    onCerrar();
  };

  const confirmar = () => {
    if (!motivo.trim()) {
      setError('El motivo de devolución es obligatorio.');
      return;
    }
    onConfirmar({ motivo: motivo.trim(), observaciones: observaciones.trim() });
  };

  return (
    <Modal abierto={abierto} titulo="Devolver interconsulta" onCerrar={cerrar}>
      <label htmlFor="motivo-devolucion" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
        Motivo de devolución (*):
      </label>
      <input
        id="motivo-devolucion"
        type="text"
        maxLength={300}
        value={motivo}
        onChange={(e) => {
          setMotivo(e.target.value);
          setError('');
        }}
        style={{ width: '100%', ...(error ? { border: '1px solid var(--danger)' } : {}) }}
      />
      {error && <small role="alert" className="texto-error" style={{ display: 'block', marginTop: '4px' }}>{error}</small>}

      <label htmlFor="obs-devolucion" style={{ display: 'block', fontWeight: 'bold', margin: '12px 0 5px' }}>
        Observaciones (opcional):
      </label>
      <textarea
        id="obs-devolucion"
        rows="3"
        maxLength={500}
        value={observaciones}
        onChange={(e) => setObservaciones(e.target.value)}
        style={{ width: '100%' }}
      />

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button type="button" onClick={cerrar} disabled={enviando} className="btn-secundario">Cancelar</button>
        <button type="button" onClick={confirmar} disabled={enviando} className="btn-peligro">
          {enviando ? 'Devolviendo...' : 'Devolver interconsulta'}
        </button>
      </div>
    </Modal>
  );
}
