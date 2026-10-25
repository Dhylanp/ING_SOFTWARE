import { useState } from 'react';
import Modal from './Modal';
import { CAUSALES_CIERRE } from '../lib/estados';

// HU09: la causal es obligatoria; sin elegir una no se puede confirmar.
export default function ModalCierre({ abierto, onCerrar, onConfirmar, enviando = false }) {
  const [causal, setCausal] = useState('');
  const [error, setError] = useState('');

  const cerrar = () => {
    setCausal('');
    setError('');
    onCerrar();
  };

  const confirmar = () => {
    if (!causal) {
      setError('Seleccione una causal de cierre.');
      return;
    }
    onConfirmar(causal);
  };

  return (
    <Modal abierto={abierto} titulo="Cerrar interconsulta" onCerrar={cerrar}>
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 'bold', marginBottom: '8px' }}>Causal de cierre (*):</legend>
        {CAUSALES_CIERRE.map((c) => (
          <label key={c} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 0' }}>
            <input
              type="radio"
              name="causal"
              value={c}
              checked={causal === c}
              onChange={() => {
                setCausal(c);
                setError('');
              }}
            />
            {c}
          </label>
        ))}
      </fieldset>
      {error && <small role="alert" className="texto-error" style={{ display: 'block', marginTop: '6px' }}>{error}</small>}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button type="button" onClick={cerrar} disabled={enviando} className="btn-secundario">Cancelar</button>
        <button type="button" onClick={confirmar} disabled={enviando}>
          {enviando ? 'Cerrando...' : 'Confirmar cierre'}
        </button>
      </div>
    </Modal>
  );
}
