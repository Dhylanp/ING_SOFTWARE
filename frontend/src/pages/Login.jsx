import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function Login({ onLogin }) {
  // 1. Estados para capturar el RUT y la Clave
  const [rut, setRut] = useState('');
  const [clave, setClave] = useState('');
  
  // Estados para controlar la interfaz de usuario
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validación básica en el cliente
    if (!rut || !clave) {
      setError('Por favor, ingresa tu RUT y clave.');
      setIsLoading(false);
      return;
    }

    // Convertir el RUT a número entero (ya que tu API pide un 'int')
    const rutEntero = parseInt(rut, 10);
    if (isNaN(rutEntero)) {
      setError('El RUT debe ser un número válido (sin puntos, guiones ni dígito verificador).');
      setIsLoading(false);
      return;
    }

    try {
      // 2. Petición GET insertando las variables directamente en la URL
      // FastAPI interpretará la ruta como: /persona/12345678/miClaveSegura
      const response = await api.get(`/persona/${rutEntero}/${clave}`);

      // Si el servidor responde con datos (len(respuesta) != 0 en tu Python)
      if (response.data && response.data.length > 0) {
        const datosUsuario = response.data[0]; // Tomamos el primer elemento del arreglo
        
        // Guardamos los datos del usuario en localStorage para usarlos en otras pantallas si es necesario
        localStorage.setItem('usuario_nombre', datosUsuario.nombrePersona);
        localStorage.setItem('usuario_rut', datosUsuario.rut);
        localStorage.setItem('usuario_comuna', datosUsuario.idComuna);

        // Simulamos un indicador de sesión activa para que App.jsx renderice las rutas privadas
        localStorage.setItem('isLoggedIn', 'true'); 
        
        onLogin(); // Avisamos a App.jsx para actualizar el estado
        navigate('/interconsultas'); // Redirigimos a la pantalla médica
      } else {
        setError('Usuario o clave incorrectos.');
      }
    } catch (err) {
      // Manejo de errores basado en las respuestas de tu FastAPI
      if (err.response?.status === 404) {
        setError('Credenciales inválidas. Revisa tu RUT y contraseña.');
      } else {
        setError('Ocurrió un error en el servidor médico o problemas de conexión.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Sistema Médico - Iniciar Sesión</h2>
      
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="rut" style={{ display: 'block', marginBottom: '5px' }}>RUT (Solo números):</label>
          <input
            id="rut"
            type="text"
            placeholder="Ej: 18432111"
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            disabled={isLoading}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            required
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="clave" style={{ display: 'block', marginBottom: '5px' }}>Contraseña o Clave:</label>
          <input
            id="clave"
            type="password"
            placeholder="******"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            disabled={isLoading}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {isLoading ? 'Verificando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}

export default Login;
