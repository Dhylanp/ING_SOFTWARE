import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';

// HU16: campana de alertas con el contador de devoluciones sin revisar.
export default function AlertaContador() {
  const [datos, setDatos] = useState(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    let activo = true;
    api
      .get('/alertas/devoluciones')
      .then((r) => activo && setDatos(r.data))
      .catch(() => activo && setDatos(null)); // sin red: la campana queda sin contador
    return () => {
      activo = false;
    };
  }, [pathname]);

  const nuevas = datos?.sinRevisar ?? 0;
  const pendientes = datos?.pendientes ?? 0;
  const cantidad = nuevas > 0 ? nuevas : pendientes;

  return (
    <button
      onClick={() => navigate('/alertas')}
      title="Centro de alertas"
      aria-label={
        datos
          ? `Centro de alertas: ${nuevas} alertas nuevas, ${pendientes} devoluciones pendientes`
          : 'Centro de alertas'
      }
      style={{
        position: 'fixed', top: '15px', right: '71px',
        width: '46px', height: '46px', borderRadius: '50%',
        padding: 0, cursor: 'pointer', zIndex: 1000, boxShadow: 'var(--shadow)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
      </svg>

      {datos && cantidad > 0 && (
        <span
          data-testid="contador-alertas"
          style={{
            position: 'absolute', top: '-4px', right: '-4px',
            minWidth: '20px', padding: '0 5px', borderRadius: '999px',
            fontSize: '12px', fontWeight: 'bold', lineHeight: '20px', textAlign: 'center',
            backgroundColor: nuevas > 0 ? 'var(--danger)' : 'var(--surface-alt)',
            color: nuevas > 0 ? 'var(--on-primary)' : 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
        >
          {cantidad}
        </span>
      )}
    </button>
  );
}