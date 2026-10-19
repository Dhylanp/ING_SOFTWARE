import { useState } from 'react';
import useRegistrosLocales from '../hooks/useRegistrosLocales';
import useConexion from '../hooks/useConexion';
import { eliminarSincronizados } from '../offline/almacen';
import { solicitarSincronizacion } from '../offline/sync';
import { formatearFecha } from '../lib/fechas';

const estilos = {
  pendiente: { backgroundColor: 'var(--warning-bg)', color: 'var(--warning-text)' },
  sincronizado: { backgroundColor: 'var(--success-bg)', color: 'var(--success-text)' },
  error: { backgroundColor: 'var(--error-bg)', color: 'var(--error-text)' },
};
const textos = {
  pendiente: 'Pendiente de sincronizar',
  sincronizado: 'Sincronizado',
  error: 'Error al sincronizar',
};

// HU19/HU21: registros guardados en el dispositivo con su distintivo de sincronización.
export default function PendientesLocales() {
  const { registros } = useRegistrosLocales();
  const enLinea = useConexion();
  const [enviando, setEnviando] = useState(false);

  if (registros.length === 0) return null;

  const hayPorEnviar = registros.some((r) => r.estado !== 'sincronizado');
  const haySincronizados = registros.some((r) => r.estado === 'sincronizado');

  const sincronizar = async () => {
    setEnviando(true);
    try {
      await solicitarSincronizacion();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section aria-label="Registros guardados en este dispositivo" style={{ margin: '0 0 24px', textAlign: 'left' }}>
      <h3 style={{ marginBottom: '8px' }}>Registros guardados en este dispositivo</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {registros.map((r) => (
          <li
            key={r.uuidLocal}
            data-testid="registro-local"
            style={{
              display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
              padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '6px',
              marginBottom: '6px', backgroundColor: 'var(--surface)',
            }}
          >
            <span
              data-testid="distintivo-sync"
              style={{ ...estilos[r.estado], padding: '2px 10px', borderRadius: '999px', fontSize: '13px', fontWeight: 'bold' }}
            >
              {textos[r.estado] || r.estado}
            </span>
            <span>
              <strong>{r.nombrePaciente || `Paciente #${r.payload.idPersona}`}</strong>
              {' · '}{formatearFecha(r.payload.fechaInicio)}
              {r.estado === 'sincronizado' && r.idFormulario && ` · Interconsulta #${r.idFormulario}`}
            </span>
            {r.estado === 'error' && r.detalle && <small className="texto-error">{r.detalle}</small>}
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        {hayPorEnviar && (
          <button type="button" onClick={sincronizar} disabled={!enLinea || enviando}>
            {enviando ? 'Sincronizando...' : 'Sincronizar ahora'}
          </button>
        )}
        {haySincronizados && (
          <button type="button" className="btn-secundario" onClick={() => eliminarSincronizados()}>
            Quitar sincronizados
          </button>
        )}
      </div>
    </section>
  );
}
