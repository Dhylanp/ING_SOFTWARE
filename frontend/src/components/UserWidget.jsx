import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAuth,
  getNombreRol,
  getDescripcionRol
} from '../context/AuthContext';

const UserWidget = () => {
  const { usuario, logout, tieneRol } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const navigate = useNavigate();

  // Si no hay usuario, no renderizamos nada
  if (!usuario) return null;

  // Normalizamos el usuario a la forma que espera el widget
  const sesion = {
    idPersona: usuario.idPersona,
    rut: usuario.rut,
    nombrePersona: usuario.nombrePersona,
    rolActual: Number(usuario.idRol ?? usuario.rolActual),
    accesos: Array.isArray(usuario.accesos) ? usuario.accesos : []
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Helper: obtiene el acceso para un rol dado
  const getAcceso = (idRol) => {
    return sesion.accesos.find(
      (a) => Number(a.idRol) === Number(idRol)
    );
  };

  const puedeGestionar = tieneRol(4);
  const accesoAdmin = getAcceso(1);
  const accesoExterno = getAcceso(2);

  return (
    <>
      {/* Círculo flotante arriba a la derecha */}
      <button
        onClick={() => setAbierto((v) => !v)}
        title="Perfil"
        style={{
          position: 'fixed',
          top: '15px',
          right: '15px',
          width: '46px',
          height: '46px',
          borderRadius: '50%',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: 'var(--shadow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0
        }}
        aria-label="Abrir datos de usuario"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z" />
        </svg>
      </button>

      {abierto && (
        <>
          {/* Capa para cerrar al hacer click fuera */}
          <div
            onClick={() => setAbierto(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
              background: 'transparent'
            }}
          />

          <div
            style={{
              position: 'fixed',
              top: '70px',
              right: '15px',
              width: '320px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              boxShadow: 'var(--shadow)',
              padding: '18px',
              zIndex: 1001,
              fontSize: '14px',
              color: 'var(--text-h)',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
          >
            <h3
              style={{
                margin: '0 0 12px',
                fontSize: '16px',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '8px'
              }}
            >
              Datos de Sesión
            </h3>

            <Dato etiqueta="ID Usuario" valor={sesion.idPersona} />
            <Dato etiqueta="RUT" valor={sesion.rut} />
            <Dato etiqueta="Nombre" valor={sesion.nombrePersona} />
            <Dato
              etiqueta="Rol de ingreso"
              valor={getNombreRol(sesion.rolActual)}
            />

            <h4
              style={{
                margin: '14px 0 6px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Accesos ({sesion.accesos.length})
            </h4>

            {sesion.accesos.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {sesion.accesos.map((a, i) => (
                  <li
                    key={i}
                    style={{
                      padding: '10px',
                      marginBottom: '6px',
                      backgroundColor: 'var(--surface-alt)',
                      borderRadius: '6px',
                      borderLeft: '3px solid var(--primary)'
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 'bold',
                        marginBottom: '3px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>{getNombreRol(a.idRol)}</span>
                      {Number(a.idRol) === sesion.rolActual && (
                        <span
                          style={{
                            fontSize: '10px',
                            backgroundColor: 'var(--primary)',
                            color: 'var(--on-primary)',
                            padding: '2px 6px',
                            borderRadius: '8px'
                          }}
                        >
                          ACTUAL
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {getDescripcionRol(a.idRol)}
                    </div>
                    {a.tipoCentro && a.tipoCentro !== 'x' && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text)',
                          marginTop: '4px',
                          paddingTop: '4px',
                          borderTop: '1px dashed var(--border)'
                        }}
                      >
                        <strong>{a.tipoCentro}:</strong> {a.nombreCentro}{' '}
                        <span style={{ color: 'var(--text-muted)' }}>(ID {a.idCentro})</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                Sin accesos registrados
              </p>
            )}

            {(puedeGestionar || accesoAdmin || accesoExterno) && (
              <>
                <h4
                  style={{
                    margin: '14px 0 6px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Accesos rápidos
                </h4>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  {puedeGestionar && (
                    <BotonAccion
                      onClick={() => {
                        setAbierto(false);
                        navigate('/GestorRoles');
                      }}
                    >
                      Gestionar Roles
                    </BotonAccion>
                  )}
                  <BotonAccion
                    onClick={() => {
                      setAbierto(false);
                      navigate('/interconsultas');
                    }}
                  >
                    Interconsultas
                  </BotonAccion>
                </div>
              </>
            )}

            <button
              onClick={handleLogout}
              className="btn-peligro"
              style={{
                width: '100%',
                marginTop: '14px',
                padding: '9px',
                fontWeight: 'bold'
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </>
  );
};

const Dato = ({ etiqueta, valor }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '4px 0',
      fontSize: '13px'
    }}
  >
    <span style={{ color: 'var(--text-muted)' }}>{etiqueta}:</span>
    <span style={{ fontWeight: 'bold', textAlign: 'right' }}>{valor}</span>
  </div>
);

const BotonAccion = ({ children, onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%',
      padding: '8px',
      backgroundColor: 'var(--primary-soft)',
      color: 'var(--text-h)',
      border: '1px solid var(--primary-soft-border)',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '13px'
    }}
  >
    {children}
  </button>
);

export default UserWidget;