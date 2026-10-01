import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Interconsultas() {
  const { sesion, tieneRol } = useAuth();

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '40px auto',
        fontFamily: 'Arial, sans-serif',
        padding: '20px'
      }}
    >
      <h2>Interconsultas</h2>

      {sesion && (
        <p style={{ color: '#555' }}>
          Hola, <strong>{sesion.nombrePersona}</strong> — ingresaste como{' '}
          <strong>{sesion.rolActual === 1 ? 'Admin' : sesion.rolActual === 2 ? 'Externo' : sesion.rolActual === 3 ? 'Usuario' : 'Gestionador de Roles'}</strong>
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Link to="/interconsultas/registrar">Registrar interconsulta</Link>
        <Link to="/interconsultas/listado">Listado de interconsultas</Link>

        {tieneRol(4) && (
          <Link to="/GestorRoles">Gestionar Roles por Usuario</Link>
        )}

        {(tieneRol(1) || tieneRol(2)) && (
          <Link to="/accesos">Administrar Accesos</Link>
        )}
      </div>
    </div>
  );
}