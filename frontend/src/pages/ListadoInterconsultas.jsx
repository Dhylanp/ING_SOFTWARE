import { useState, useMemo } from 'react';
import TablaInterconsultas from '../components/TablaInterconsultas';

const estadosDisponibles = [
  { id: 1, nombre: 'Registrada' },
  { id: 2, nombre: 'En lista de espera' },
  { id: 3, nombre: 'Devuelta' },
  { id: 4, nombre: 'Enviada' },
];

const filtrosIniciales = { estados: [], prioridad: 0, desde: '', hasta: '' };

export default function ListadoInterconsultas() {
  const [filtros, setFiltros] = useState(filtrosIniciales);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltros({
      ...filtros,
      [name]: name === 'prioridad' ? Number(value) : value,
    });
  };

  const toggleEstado = (id) => {
    const nuevosEstados = filtros.estados.includes(id)
      ? filtros.estados.filter((e) => e !== id)
      : [...filtros.estados, id];
    setFiltros({ ...filtros, estados: nuevosEstados });
  };

  const limpiarFiltros = () => {
    setFiltros(filtrosIniciales);
  };

  const fechasInvalidas = Boolean(
    filtros.desde && filtros.hasta && filtros.desde > filtros.hasta
  );
  const estiloFecha = fechasInvalidas ? { borderColor: 'var(--error-text)' } : {};

  // FIX: memoizar el objeto de filtros para que la referencia no cambie en
  // cada render y el useEffect del hijo no dispare peticiones innecesarias.
  const filtrosMemo = useMemo(() => filtros, [filtros]);

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px' }}>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
        <select name="prioridad" value={filtros.prioridad} onChange={handleChange}>
          <option value={0}>Todas las prioridades</option>
          <option value={1}>Alta</option>
          <option value={2}>Media</option>
          <option value={3}>Baja</option>
        </select>
        <button onClick={limpiarFiltros}>Limpiar filtros</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '12px' }}>
        <span>Estados:</span>
        {estadosDisponibles.map((estado) => (
          <label key={estado.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="checkbox"
              checked={filtros.estados.includes(estado.id)}
              onChange={() => toggleEstado(estado.id)}
            />
            {estado.nombre}
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          Desde
          <input type="date" name="desde" value={filtros.desde} onChange={handleChange} style={estiloFecha} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          Hasta
          <input type="date" name="hasta" value={filtros.hasta} onChange={handleChange} style={estiloFecha} />
        </label>
      </div>
      {fechasInvalidas && (
        <p style={{ color: 'var(--error-text)', fontSize: '13px', margin: '6px 0 0' }}>
          La fecha "desde" no puede ser posterior a la fecha "hasta".
        </p>
      )}

      <div style={{ marginTop: '20px' }}>
        {!fechasInvalidas && <TablaInterconsultas filtros={filtrosMemo} />}
      </div>
    </div>
  );
}