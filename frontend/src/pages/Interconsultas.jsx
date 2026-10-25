import { useNavigate } from 'react-router-dom';
import { useAuth, getNombreRol } from '../context/AuthContext';
import AlertaContador from '../components/AlertaContador';

export default function Interconsultas() {
  const { usuario, tieneRol } = useAuth();
  const navigate = useNavigate();
  const estiloBoton = { width: '100%', maxWidth: '320px', padding: '12px 16px', fontSize: '16px' };

  /*
  tieneRol(1) -> Admin (administrativo / médico del CESFAM)
  tieneRol(2) -> Usuario Externo (especialista del hospital)
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

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        {tieneRol(2) && (
          <button style={estiloBoton} onClick={() => navigate('/especialista/bandeja')}>
            Bandeja de revisión (aceptar / devolver)
          </button>
        )}
        {!tieneRol(4) && (
          <button style={estiloBoton} onClick={() => navigate('/interconsultas/listado')}>
            Listado de interconsultas
          </button>
        )}
        {tieneRol(1) && (
          <button style={estiloBoton} onClick={() => navigate('/interconsultas/registrar')}>
            Registrar interconsulta
          </button>
        )}
        {tieneRol(1) && (
          <button style={estiloBoton} onClick={() => navigate('/interconsultas/devueltas')}>
            Interconsultas devueltas
          </button>
        )}
        {tieneRol(1) && (
          <button style={estiloBoton} onClick={() => navigate('/pacientes/ficha')}>
            Ficha del paciente
          </button>
        )}
        {!tieneRol(4) && (
          <button style={estiloBoton} onClick={() => navigate('/EditarPerfil')}>
            Revisar mis datos personales
          </button>
        )}
        {tieneRol(4) && (
          <button style={estiloBoton} onClick={() => navigate('/GestorRoles')}>
            Gestionar Roles por Usuario
          </button>
        )}
      </div>
    </div>
  );
}
