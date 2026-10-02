import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import LoadingOverlay from '../components/LoadingOverlay';

const API_URL = 'https://ingsoftware-production-4899.up.railway.app';

const SignUp = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    rut: '',
    dv: '',
    nombrePersona: '',
    clave: '',
    repetirClave: '',
    fechaNac: '',
    calle: '',
    idComuna: '',
    idRegion: ''
  });

  const [regiones, setRegiones] = useState([]);
  const [comunas, setComunas] = useState([]);
  const [loadingRegiones, setLoadingRegiones] = useState(false);
  const [loadingComunas, setLoadingComunas] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const loading = loadingRegiones || loadingComunas || loadingSubmit;

  const clavesNoCoinciden =
    formData.repetirClave.length > 0 && formData.clave !== formData.repetirClave;

  // Cargar regiones al montar
  useEffect(() => {
    const cargarRegiones = async () => {
      setLoadingRegiones(true);
      try {
        const url = `${API_URL}/region`;
        const res = await fetch(url);

        if (!res.ok) {
          const errorText = await res.text();
          console.error('[SignUp] Error regiones:', res.status, errorText);
          Swal.fire({
            icon: 'error',
            title: 'Error al cargar regiones',
            text: `El servidor respondió con estado ${res.status}.`
          });
          return;
        }

        const data = await res.json();
        setRegiones(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('[SignUp] Error de red regiones:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error de conexión',
          text: 'No se pudieron cargar las regiones.'
        });
      } finally {
        setLoadingRegiones(false);
      }
    };
    cargarRegiones();
  }, []);

  // Cargar comunas cuando cambia la región
  useEffect(() => {
    const cargarComunas = async () => {
      setLoadingComunas(true);
      try {
        const regionParam = formData.idRegion === '' ? 0 : formData.idRegion;
        const url = `${API_URL}/comuna/${regionParam}`;
        const res = await fetch(url);

        if (!res.ok) {
          const errorText = await res.text();
          console.error('[SignUp] Error comunas:', res.status, errorText);
          setComunas([]);
          return;
        }

        const data = await res.json();
        setComunas(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('[SignUp] Error de red comunas:', err);
        setComunas([]);
      } finally {
        setLoadingComunas(false);
      }
    };
    cargarComunas();
  }, [formData.idRegion]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'fechaNac') {
      const soloNumeros = value.replace(/\D/g, '').slice(0, 8);
      let formateada = '';

      if (soloNumeros.length <= 2) {
        formateada = soloNumeros;
      } else if (soloNumeros.length <= 4) {
        formateada = `${soloNumeros.slice(0, 2)}/${soloNumeros.slice(2)}`;
      } else {
        formateada = `${soloNumeros.slice(0, 2)}/${soloNumeros.slice(2, 4)}/${soloNumeros.slice(4)}`;
      }

      setFormData({ ...formData, fechaNac: formateada });
      return;
    }

    if (name === 'idRegion') {
      setFormData({
        ...formData,
        idRegion: value,
        idComuna: ''
      });
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const convertirFecha = (fecha) => {
    const partes = fecha.split('/');
    if (partes.length !== 3) return null;

    const [dia, mes, anio] = partes;
    if (dia.length !== 2 || mes.length !== 2 || anio.length !== 4) return null;

    const diaNum = Number(dia);
    const mesNum = Number(mes);
    const anioNum = Number(anio);

    if (isNaN(diaNum) || isNaN(mesNum) || isNaN(anioNum)) return null;

    const anioActual = new Date().getFullYear();
    if (anioNum < 1900 || anioNum > anioActual) return null;
    if (mesNum < 1 || mesNum > 12) return null;
    if (diaNum < 1) return null;

    const esBisiesto =
      (anioNum % 4 === 0 && anioNum % 100 !== 0) || anioNum % 400 === 0;
    const diasPorMes = [31, esBisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    if (diaNum > diasPorMes[mesNum - 1]) return null;

    return `${anio}-${mes}-${dia}`;
  };

  // 🔽 NUEVA función: intenta iniciar sesión con las credenciales recién creadas
  const intentarAutoLogin = async () => {
    try {
      const loginRes = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut: Number(formData.rut),
          clave: formData.clave
        })
      });

      const loginData = await loginRes.json();

      // Acepta distintos nombres comunes para el token
      const token =
        loginData?.token ||
        loginData?.access_token ||
        loginData?.accessToken ||
        null;

      if (loginRes.ok && token) {
        // Guardar sesión (ajusta las claves según tu proyecto)
        localStorage.setItem('token', token);

        const usuario =
          loginData?.user || loginData?.usuario || loginData?.persona || null;
        if (usuario) {
          localStorage.setItem('user', JSON.stringify(usuario));
        }

        return true;
      }

      console.warn('[SignUp] Auto-login sin token:', loginData);
      return false;
    } catch (err) {
      console.error('[SignUp] Error en auto-login:', err);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.rut ||
      !formData.dv ||
      !formData.nombrePersona ||
      !formData.clave ||
      !formData.repetirClave ||
      !formData.fechaNac ||
      !formData.calle ||
      !formData.idComuna
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Todos los campos son obligatorios.'
      });
      return;
    }

    if (formData.clave !== formData.repetirClave) {
      Swal.fire({
        icon: 'error',
        title: 'Las claves no coinciden',
        text: 'La contraseña y su confirmación deben ser iguales.'
      });
      return;
    }

    const fechaConvertida = convertirFecha(formData.fechaNac);
    if (!fechaConvertida) {
      Swal.fire({
        icon: 'error',
        title: 'Fecha incorrecta',
        text: 'Ingrese la fecha en formato dd/mm/aaaa.'
      });
      return;
    }

    const payload = {
      rut: Number(formData.rut),
      dv: formData.dv.toLowerCase(),
      nombrePersona: formData.nombrePersona,
      clave: formData.clave,
      fechaNac: fechaConvertida,
      calle: formData.calle,
      idComuna: Number(formData.idComuna)
    };

    setLoadingSubmit(true);
    try {
      const response = await fetch(`${API_URL}/persona`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data && data.codigo === 0) {
        setLoadingSubmit(false);
        Swal.fire({
          icon: 'warning',
          title: 'RUT ya registrado',
          text: data.mensaje || 'Ya existe un Usuario asignado a ese RUT.'
        });
        return;
      }

      if (!response.ok) {
        setLoadingSubmit(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.detail || 'No se pudo crear el usuario.'
        });
        return;
      }

      if (data && data.codigo === 1) {
        // 🔽 Registro OK → intentar auto-login
        const logueado = await intentarAutoLogin();
        setLoadingSubmit(false);

        if (logueado) {
          await Swal.fire({
            icon: 'success',
            title: '¡Bienvenido!',
            text: 'Tu cuenta fue creada e iniciaste sesión automáticamente.',
            timer: 1600,
            showConfirmButton: false
          });
          navigate('/'); // 👈 cambia por la ruta de tu home/dashboard
        } else {
          await Swal.fire({
            icon: 'success',
            title: 'Usuario creado',
            text: 'Tu cuenta fue creada correctamente.',
            timer: 1500,
            showConfirmButton: false
          });
          navigate('/interconsultas'); // 👈 AQUÍ
        }
      }
    } catch (error) {
      setLoadingSubmit(false);
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudo conectar con el servidor.'
      });
    }
  };

  return (
    <div
      style={{
        maxWidth: '500px',
        margin: '40px auto',
        padding: '30px',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <LoadingOverlay visible={loading} texto="Cargando..." />

      <h2>Crear Usuario como Paciente</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>RUT:</label>
          <input
            type="number"
            name="rut"
            value={formData.rut}
            onChange={handleChange}
            placeholder="Ej: 22079779"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>DV:</label>
          <input
            type="text"
            name="dv"
            value={formData.dv}
            onChange={handleChange}
            maxLength="1"
            placeholder="Ej: 9"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Nombre completo:</label>
          <input
            type="text"
            name="nombrePersona"
            value={formData.nombrePersona}
            onChange={handleChange}
            placeholder="Ej: Juan Pérez"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Clave:</label>
          <input
            type="password"
            name="clave"
            value={formData.clave}
            onChange={handleChange}
            placeholder="Ingrese su clave"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Repetir clave:</label>
          <input
            type="password"
            name="repetirClave"
            value={formData.repetirClave}
            onChange={handleChange}
            placeholder="Repita su clave"
            style={{
              width: '100%',
              padding: '8px',
              boxSizing: 'border-box',
              borderColor: clavesNoCoinciden ? '#c00' : undefined
            }}
          />
          {clavesNoCoinciden && (
            <small style={{ color: '#c00' }}>Las claves no coinciden.</small>
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Fecha de nacimiento:</label>
          <input
            type="text"
            name="fechaNac"
            value={formData.fechaNac}
            onChange={handleChange}
            placeholder="dd/mm/aaaa"
            maxLength="10"
            inputMode="numeric"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Calle:</label>
          <input
            type="text"
            name="calle"
            value={formData.calle}
            onChange={handleChange}
            placeholder="Ej: Av. España 123"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Región:</label>
          <select
            name="idRegion"
            value={formData.idRegion}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          >
            <option value="">Todas las regiones</option>
            {regiones.map((r) => (
              <option key={r.idRegion} value={r.idRegion}>
                {r.nombreRegion}
              </option>
            ))}
          </select>
          {regiones.length === 0 && !loadingRegiones && (
            <small style={{ color: '#c00' }}>
              No se pudieron cargar las regiones.
            </small>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>Comuna:</label>
          <select
            name="idComuna"
            value={formData.idComuna}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          >
            <option value="">Seleccione una comuna</option>
            {comunas.map((c) => (
              <option key={c.idComuna} value={c.idComuna}>
                {c.nombreComuna}
              </option>
            ))}
          </select>
          {comunas.length === 0 && !loadingComunas && (
            <small style={{ color: '#c00' }}>
              No se pudieron cargar las comunas.
            </small>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: loading ? '#999' : '#0056b3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loadingSubmit ? 'Cargando...' : 'Crear Usuario'}
        </button>
      </form>

      <p
        onClick={() => navigate('/login')}
        style={{
          color: '#0066cc',
          cursor: 'pointer',
          textAlign: 'center',
          marginTop: '20px'
        }}
      >
        Volver al inicio de sesión
      </p>
    </div>
  );
};

export default SignUp;