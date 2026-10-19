import EstadoBadge from './EstadoBadge';
import { formatearFechaHora } from '../lib/fechas';

// HU07: historial cronológico con fecha, estado anterior, estado nuevo y responsable.
export default function LineaTiempo({ eventos = [], cargando = false, error = '' }) {
  if (cargando) return <p>Cargando historial...</p>;
  if (error) return <p className="texto-error">{error}</p>;
  if (eventos.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>Esta interconsulta aún no tiene historial.</p>;
  }

  return (
    <ol
      aria-label="Historial de estados"
      style={{ listStyle: 'none', margin: 0, padding: '0 0 0 18px', borderLeft: '3px solid var(--primary)', textAlign: 'left' }}
    >
      {eventos.map((e) => (
        <li key={e.idHistorial} data-testid="evento-historial" style={{ position: 'relative', padding: '0 0 18px 14px' }}>
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', left: '-27px', top: '4px', width: '12px', height: '12px',
              borderRadius: '50%', backgroundColor: 'var(--primary)', border: '2px solid var(--surface)',
            }}
          />
          <div style={{ fontWeight: 'bold', color: 'var(--text-h)' }}>{formatearFechaHora(e.fecha)}</div>
          <div style={{ margin: '4px 0' }}>
            {e.estadoAnterior ? (
              <>
                <EstadoBadge idEstado={e.idEstadoAnterior} nombre={e.estadoAnterior} />
                <span aria-label="cambió a"> → </span>
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Inicio → </span>
            )}
            <EstadoBadge idEstado={e.idEstadoNuevo} nombre={e.estadoNuevo} />
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Responsable: {e.usuario}</div>
          {e.comentario && <div style={{ fontSize: '14px' }}>{e.comentario}</div>}
        </li>
      ))}
    </ol>
  );
}
