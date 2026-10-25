import { COLORES_ESTADO, nombreEstado } from '../lib/estados';

// Distintivo de color con el nombre del estado (HU06: el estado se ve de un vistazo).
export default function EstadoBadge({ idEstado, nombre }) {
  const estilo = COLORES_ESTADO[Number(idEstado)] || {};
  return (
    <span
      data-testid="estado-badge"
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '13px',
        fontWeight: 'bold',
        border: '1px solid var(--border)',
        whiteSpace: 'nowrap',
        ...estilo,
      }}
    >
      {nombre || nombreEstado(idEstado)}
    </span>
  );
}
