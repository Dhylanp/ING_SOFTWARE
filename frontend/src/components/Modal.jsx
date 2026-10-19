import { useEffect, useId, useRef } from 'react';

// Ventana modal accesible: Esc y clic fuera la cierran, y el foco entra en ella.
export default function Modal({ abierto, titulo, onCerrar, children }) {
  const tituloId = useId();
  const caja = useRef(null);
  // el cierre se lee desde una ref para que el efecto solo corra al abrir
  // (si dependiera de onCerrar, el foco volvería al primer campo en cada tecla)
  const cerrarRef = useRef(onCerrar);
  useEffect(() => {
    cerrarRef.current = onCerrar;
  });

  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = (e) => {
      if (e.key === 'Escape') cerrarRef.current?.();
    };
    document.addEventListener('keydown', alTeclear);
    caja.current?.querySelector('input, textarea, select, button')?.focus();
    return () => document.removeEventListener('keydown', alTeclear);
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 2000,
      }}
    >
      <div
        ref={caja}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        style={{
          backgroundColor: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          boxShadow: 'var(--shadow)',
          padding: '20px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          textAlign: 'left',
          boxSizing: 'border-box',
        }}
      >
        <h2 id={tituloId} style={{ marginBottom: '12px' }}>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
