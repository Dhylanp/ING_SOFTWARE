import { useState } from 'react';
import TablaInterconsultas from '../components/TablaInterconsultas';

export default function ListadoInterconsultas() {
  // Estado y funcion
  const [filtros, setFiltros] = useState({
    estado: 0,
    prioridad: 0,
  });

  const handleChange = (e) => {
    setFiltros({
      ...filtros,
      [e.target.name]: e.target.name === 'estado' ? Number(e.target.value) : e.target.value,
    });
  };

  const limpiarFiltros = () => {
    setFiltros({ estado: 0, prioridad: 0 });
  };

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px' }}>

      {/*Selectores*/}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <select name="estado" value={filtros.estado} onChange={handleChange}>
          <option value={0}>Todos los estados</option>
          <option value={1}>Registrada</option>
          <option value={2}>En lista de espera</option>
          <option value={3}>Devuelta</option>
          <option value={4}>Enviada</option>
        </select>

        <select name="prioridad" value={filtros.prioridad} onChange={handleChange}>
          <option value={0}>Todas las prioridades</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
        <button onClick={limpiarFiltros}>Limpiar filtros</button>
      </div>

      <TablaInterconsultas filtros={filtros} />
    </div>
  );
}