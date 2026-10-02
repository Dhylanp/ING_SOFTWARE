import React from 'react';
import { useAuth } from '../context/AuthContext';

const UserWidget = () => {
  const {
    usuario,
    logout
  } = useAuth();

  if (!usuario) {
    return null;
  }

  return (
    <div
      style={{
        padding: '10px 20px',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <div>
        <strong>
          {usuario.nombrePersona}
        </strong>

        <span style={{ marginLeft: '15px' }}>
          Rol: {usuario.idRol}
        </span>
      </div>

      <button
        onClick={logout}
      >
        Cerrar sesión
      </button>
    </div>
  );
};

export default UserWidget;