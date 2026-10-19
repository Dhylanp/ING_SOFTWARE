import { useState } from 'react';
import useConexion from '../hooks/useConexion';
import useRegistrosLocales from '../hooks/useRegistrosLocales';
import { solicitarSincronizacion } from '../offline/sync';

// Franja inferior: avisa cuando no hay internet y cuántos registros esperan sincronizarse.
export default function EstadoConexion() {
  const enLinea = useConexion();
  const { registros } = useRegistrosLocales();
  const [enviando, setEnviando] = useState(false);
  const pendientes = registros.filter((r) => r.estado !== 'sincronizado').length;

  if (enLinea && pendientes === 0) return null;

  const sincronizar = async () => {
    setEnviando(true);
    try {
      await solicitarSincronizacion();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      role="status"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1500,
        padding: '10px 16px', display: 'flex', gap: '12px', justifyContent: 'center',
        alignItems: 'center', flexWrap: 'wrap',
        backgroundColor: enLinea ? 'var(--warning-bg)' : 'var(--error-bg)',
        color: enLinea ? 'var(--warning-text)' : 'var(--error-text)',
        borderTop: '1px solid var(--border)', fontWeight: 'bold',
      }}
    >
      <span>
        {enLinea ? 'Conexión restablecida.' : 'Sin conexión: puede seguir trabajando, los registros se guardan en este dispositivo.'}
        {pendientes > 0 && ` ${pendientes} registro(s) pendiente(s) de sincronizar.`}
      </span>
      {enLinea && pendientes > 0 && (
        <button type="button" onClick={sincronizar} disabled={enviando}>
          {enviando ? 'Sincronizando...' : 'Sincronizar ahora'}
        </button>
      )}
    </div>
  );
}
