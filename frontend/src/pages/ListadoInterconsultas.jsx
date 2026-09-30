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
      [e.target.name]: Number(e.target.value),
    });
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
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <TablaInterconsultas filtros={filtros} />
    </div>
  );
}