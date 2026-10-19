import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { mensajeDeError } from '../lib/avisos';
import { formatearFechaHora } from '../lib/fechas';

// HU16: centro de alertas. Al entrar, las devoluciones nuevas se marcan como revisadas.
export default function CentroAlertas() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [revisadas, setRevisadas] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const r = await api.get('/alertas/devoluciones');
        if (!activo) return;
        setDatos(r.data);
        if (r.data.sinRevisar > 0) {
          await api.post('/alertas/devoluciones/revisar');
          if (!activo) return;
          setRevisadas(true);
        }
      } catch (err) {
        if (activo) setError(mensajeDeError(err, 'No se pudo cargar el centro de alertas.'));
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const nuevas = datos?.sinRevisar ?? 0;

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '40px auto', padding: '20px', boxSizing: 'border-box' }}>
      <Link to="/interconsultas">← Volver al inicio</Link>
      <h2 style={{ marginTop: '16px' }}>Centro de alertas</h2>

      {error && <p className="texto-error">{error}</p>}
      {!datos && !error && <p>Cargando...</p>}

      {datos && (
        <>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '16px', padding: '16px',
              backgroundColor: datos.pendientes > 0 ? 'var(--error-bg)' : 'var(--success-bg)',
              color: datos.pendientes > 0 ? 'var(--error-text)' : 'var(--success-text)',
              borderRadius: '8px', marginBottom: '12px', textAlign: 'left',
            }}
          >
            <span data-testid="contador-pendientes" style={{ fontSize: '40px', fontWeight: 'bold' }}>
              {datos.pendientes}
            </span>
            <span>
              {datos.pendientes === 1
                ? 'devolución pendiente de gestionar'
                : 'devoluciones pendientes de gestionar'}
            </span>
          </div>

          {revisadas && (
            <p role="status" style={{ color: 'var(--success-text)', marginBottom: '12px' }}>
              {nuevas === 1 ? '1 alerta nueva fue marcada' : `${nuevas} alertas nuevas fueron marcadas`} como revisada
              {nuevas === 1 ? '' : 's'}.
            </p>
          )}
          {!revisadas && datos.pendientes > 0 && (
            <p role="status" style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>
              Todas las alertas ya habían sido revisadas.
            </p>
          )}

          {datos.items.length === 0 ? (
            <p>No hay devoluciones pendientes. ¡Todo al día!</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'left' }}>
              {datos.items.map((i) => (
                <li
                  key={i.idFormulario}
                  data-testid="alerta-item"
                  style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px', marginBottom: '8px', backgroundColor: 'var(--surface)' }}
                >
                  <div>
                    <strong>#{i.idFormulario} · {i.nombrePersona}</strong>{' '}
                    <span style={{ color: 'var(--text-muted)' }}> — {i.nombreEspecialidad || 'Sin especialidad'} · {i.nombreHospital}</span>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Devuelta el {formatearFechaHora(i.fecha)}</div>
                  <div style={{ margin: '4px 0' }}>Motivo: {i.motivo}</div>
                  <Link to={`/interconsultas/${i.idFormulario}/corregir`}>Corregir y reenviar</Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
