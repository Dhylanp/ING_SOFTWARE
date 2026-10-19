// "2026-10-06T15:30:00Z" -> "06-10-2026 12:30" (hora local del navegador)
export const formatearFechaHora = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const dos = (n) => String(n).padStart(2, '0');
  return `${dos(d.getDate())}-${dos(d.getMonth() + 1)}-${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
};

// "2026-10-06" o "2026-10-06T15:30" -> "06-10-2026" (sin convertir zona horaria)
export const formatearFecha = (fecha) => {
  if (!fecha) return '';
  const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
  return `${dia}-${mes}-${anio}`;
};
