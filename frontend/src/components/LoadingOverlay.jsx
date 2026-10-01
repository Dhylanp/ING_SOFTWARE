import React from 'react';

const LoadingOverlay = ({ visible, texto = 'Cargando...' }) => {
  if (!visible) return null;

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          cursor: 'wait'
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            padding: '30px 50px',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}
        >
          <div
            style={{
              width: '50px',
              height: '50px',
              border: '5px solid #f3f3f3',
              borderTop: '5px solid #0056b3',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          <p style={{ margin: 0, fontWeight: 'bold', color: '#333' }}>
            {texto}
          </p>
        </div>
      </div>
    </>
  );
};

export default LoadingOverlay;