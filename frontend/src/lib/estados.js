// Estados del flujo de una interconsulta. Deben coincidir con la tabla `estados`
// y con DATA/servicios.py.
export const E_REGISTRADA = 1;
export const E_LISTA_ESPERA = 2;
export const E_DEVUELTA = 3;
export const E_TRAMITADA = 4;
export const E_AGENDADA = 5;
export const E_FINALIZADA = 6;

export const ESTADOS = [
  { id: E_REGISTRADA, nombre: 'Registrada' },
  { id: E_LISTA_ESPERA, nombre: 'En lista de espera' },
  { id: E_DEVUELTA, nombre: 'Devuelta' },
  { id: E_TRAMITADA, nombre: 'Tramitada' },
  { id: E_AGENDADA, nombre: 'Agendada' },
  { id: E_FINALIZADA, nombre: 'Finalizada' },
];

export const nombreEstado = (id) =>
  ESTADOS.find((e) => e.id === Number(id))?.nombre ?? 'Desconocido';

// Colores del distintivo (siempre acompañados del nombre: el color no es lo único que informa)
export const COLORES_ESTADO = {
  [E_REGISTRADA]: { backgroundColor: 'var(--primary-soft)', color: 'var(--primary)' },
  [E_LISTA_ESPERA]: { backgroundColor: 'var(--warning-bg)', color: 'var(--warning-text)' },
  [E_DEVUELTA]: { backgroundColor: 'var(--error-bg)', color: 'var(--error-text)' },
  [E_TRAMITADA]: { backgroundColor: 'var(--surface-alt)', color: 'var(--text-h)' },
  [E_AGENDADA]: { backgroundColor: 'var(--success-bg)', color: 'var(--success-text)' },
  [E_FINALIZADA]: { backgroundColor: 'var(--surface-alt)', color: 'var(--text-muted)' },
};

export const PRIORIDADES = [
  { valor: 'alta', nombre: 'Alta' },
  { valor: 'media', nombre: 'Media' },
  { valor: 'baja', nombre: 'Baja' },
];

export const normalizarPrioridad = (valor) => {
  if (valor === null || valor === undefined) return null;
  const v = String(valor).trim().toLowerCase();
  if (v === 'alta' || v === '1') return 'alta';
  if (v === 'media' || v === '2') return 'media';
  if (v === 'baja' || v === '3') return 'baja';
  return null;
};
