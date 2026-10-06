import { Link } from 'react-router-dom';
import { useAuth, getNombreRol } from '../context/AuthContext';

export default function Interconsultas() {
  const { usuario, tieneRol } = useAuth();

  /*
  tieneRol(1) -> Admin
  tieneRol(2) -> Usuario Externo
  tieneRol(3) -> Paciente
  tieneRol(4) -> Administrador de Roles 
  */

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '40px auto',
        padding: '20px'
      }}
    >
      <h2>Interconsultas</h2>

      {usuario && (
        <p style={{ color: 'var(--text-muted)' }}>
          Hola, <strong>{usuario.nombrePersona}</strong> — ingresaste como{' '}
          <strong>{getNombreRol(usuario.idRol)}</strong>
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {!tieneRol(4) && (
          <Link to="/interconsultas/listado">Listado de interconsultas</Link>
        )}
        {!tieneRol(4) && (
          <Link to="/EditarPerfil">Revisar mis datos personales</Link>
        )}
        {tieneRol(1) && (
          <Link to="/interconsultas/registrar">Registrar interconsulta</Link>
        )}
        {tieneRol(1) && (
          <Link to="/pacientes/ficha">Ficha del paciente</Link>
        )}
        {tieneRol(4) && (
          <Link to="/GestorRoles">Gestionar Roles por Usuario</Link>
        )}
      </div>
    </div>
  );
}