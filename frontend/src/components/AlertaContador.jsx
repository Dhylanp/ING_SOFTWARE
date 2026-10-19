import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

// HU16: enlace al centro de alertas con el contador de devoluciones sin revisar.
export default function AlertaContador() {
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let activo = true;
    api
      .get('/alertas/devoluciones')
      .then((r) => activo && setDatos(r.data))
      .catch(() => activo && setDatos(null)); // sin red: el enlace queda sin contador
    return () => {
      activo = false;
    };
  }, []);

  const nuevas = datos?.sinRevisar ?? 0;
  const pendientes = datos?.pendientes ?? 0;

  return (
    <Link to="/alertas" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      Centro de alertas
      {datos && (
        <span
          data-testid="contador-alertas"
          aria-label={`${nuevas} alertas nuevas, ${pendientes} devoluciones pendientes`}
          style={{
            minWidth: '22px', padding: '0 7px', borderRadius: '999px', textAlign: 'center',
            fontSize: '13px', fontWeight: 'bold',
            backgroundColor: nuevas > 0 ? 'var(--danger)' : 'var(--surface-alt)',
            color: nuevas > 0 ? 'var(--on-primary)' : 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
        >
          {nuevas > 0 ? nuevas : pendientes}
        </span>
      )}
    </Link>
  );
}
