import { Link } from 'react-router-dom';

export default function Interconsultas() {
  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h2>Interconsultas</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Link to="/interconsultas/registrar">HU01A - Registrar interconsulta</Link>
        <Link to="/interconsultas/listado">HU02 - Listado de interconsultas</Link>
      </div>
    </div>
  );
}