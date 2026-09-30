import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import LoadingOverlay from '../components/LoadingOverlay';

const API = 'https://21jfmx87-8000.brs.devtunnels.ms';

const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    const response = await api.post('/login', { email, password });
    
    // 1. Guardar token
    localStorage.setItem('token', response.data.token);
    
    // 2. OBLIGATORIO: Notificar a App.jsx para cambiar isLoggedIn a true
    if (onLogin) {
      onLogin();
    }

    // 3. Redirigir
    navigate('/GestorRoles');
  } catch (error) {
    console.error("Error al iniciar sesión", error);
  }
};

const Accesos = () => {
  const [accesos, setAccesos] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [roles, setRoles] = useState([]);
  const [cesfams, setCesfams] = useState([]);
  const [hospitales, setHospitales] = useState([]);

  const [tipoCentro, setTipoCentro] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    idPersona: '',
    idRol: '',
    idCesfam: '',
    idHospital: ''
  });

  useEffect(() => {
    cargarDatos();
    cargarAccesos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);

    try {
      const [
        personasRes,
        rolesRes,
        cesfamsRes,
        hospitalesRes
      ] = await Promise.all([
        fetch(`${API}/persona`),
        fetch(`${API}/rol`),
        fetch(`${API}/cesfam`),
        fetch(`${API}/hospital`)
      ]);

      if (personasRes.ok) {
        setPersonas(await personasRes.json());
      }

      if (rolesRes.ok) {
        setRoles(await rolesRes.json());
      }

      if (cesfamsRes.ok) {
        setCesfams(await cesfamsRes.json());
      }

      if (hospitalesRes.ok) {
        setHospitales(await hospitalesRes.json());
      }

    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los datos.'
      });
    } finally {
      setLoading(false);
    }
  };

  const cargarAccesos = async () => {
    setLoading(true);

    try {
      // 0 = todos
      const res = await fetch(`${API}/Acceso/0/0/0/0`);

      if (!res.ok) {
        throw new Error('No se pudieron obtener los accesos');
      }

      const data = await res.json();
      setAccesos(data);

    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los accesos.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleTipoCentro = (e) => {
    const value = e.target.value;

    setTipoCentro(value);

    if (value === 'cesfam') {
      setFormData({
        ...formData,
        idCesfam: '',
        idHospital: ''
      });
    } else if (value === 'hospital') {
      setFormData({
        ...formData,
        idCesfam: '',
        idHospital: ''
      });
    } else {
      setFormData({
        ...formData,
        idCesfam: '',
        idHospital: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.idPersona) {
      Swal.fire({
        icon: 'warning',
        title: 'Persona requerida',
        text: 'Seleccione una persona.'
      });
      return;
    }

    if (!formData.idRol) {
      Swal.fire({
        icon: 'warning',
        title: 'Rol requerido',
        text: 'Seleccione un rol.'
      });
      return;
    }

    if (!tipoCentro) {
      Swal.fire({
        icon: 'warning',
        title: 'Centro requerido',
        text: 'Seleccione si el acceso será a un CESFAM o a un Hospital.'
      });
      return;
    }

    if (tipoCentro === 'cesfam' && !formData.idCesfam) {
      Swal.fire({
        icon: 'warning',
        title: 'CESFAM requerido',
        text: 'Seleccione un CESFAM.'
      });
      return;
    }

    if (tipoCentro === 'hospital' && !formData.idHospital) {
      Swal.fire({
        icon: 'warning',
        title: 'Hospital requerido',
        text: 'Seleccione un Hospital.'
      });
      return;
    }

    const payload = {
      idCesfam:
        tipoCentro === 'cesfam'
          ? Number(formData.idCesfam)
          : 0,

      idHospital:
        tipoCentro === 'hospital'
          ? Number(formData.idHospital)
          : 0,

      idPersona: Number(formData.idPersona),
      idRol: Number(formData.idRol)
    };

    setLoading(true);

    try {
      const response = await fetch(`${API}/acceso`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.detail || 'No se pudo crear el acceso.'
        });
        return;
      }

      Swal.fire({
        icon: 'success',
        title: 'Acceso creado',
        text: data.mensaje || 'El acceso fue creado correctamente.'
      });

      setFormData({
        idPersona: '',
        idRol: '',
        idCesfam: '',
        idHospital: ''
      });

      setTipoCentro('');

      await cargarAccesos();

    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudo conectar con el servidor.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '1100px',
        margin: '40px auto',
        padding: '30px',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <LoadingOverlay
        visible={loading}
        texto="Cargando..."
      />

      <h2>Administración de Accesos</h2>

      {/* CREAR ACCESO */}
      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '30px'
        }}
      >
        <h3>Crear Acceso</h3>

        <form onSubmit={handleSubmit}>

          {/* PERSONA */}
          <div style={{ marginBottom: '15px' }}>
            <label>Persona:</label>

            <select
              name="idPersona"
              value={formData.idPersona}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">
                Seleccione una persona
              </option>

              {personas.map((persona) => (
                <option
                  key={persona.idPersona}
                  value={persona.idPersona}
                >
                  {persona.nombrePersona} - RUT {persona.rut}-{persona.dv}
                </option>
              ))}
            </select>
          </div>

          {/* ROL */}
          <div style={{ marginBottom: '15px' }}>
            <label>Rol:</label>

            <select
              name="idRol"
              value={formData.idRol}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">
                Seleccione un rol
              </option>

              {roles.map((rol) => (
                <option
                  key={rol.idRol}
                  value={rol.idRol}
                >
                  {rol.nombreRol}
                </option>
              ))}
            </select>
          </div>

          {/* TIPO DE CENTRO */}
          <div style={{ marginBottom: '15px' }}>
            <label>Tipo de Centro:</label>

            <select
              value={tipoCentro}
              onChange={handleTipoCentro}
              style={{
                width: '100%',
                padding: '8px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">
                Seleccione un tipo
              </option>

              <option value="cesfam">
                CESFAM
              </option>

              <option value="hospital">
                Hospital
              </option>
            </select>
          </div>

          {/* CESFAM */}
          {tipoCentro === 'cesfam' && (
            <div style={{ marginBottom: '15px' }}>
              <label>CESFAM:</label>

              <select
                name="idCesfam"
                value={formData.idCesfam}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">
                  Seleccione un CESFAM
                </option>

                {cesfams.map((cesfam) => (
                  <option
                    key={cesfam.idCesfam}
                    value={cesfam.idCesfam}
                  >
                    {cesfam.nombreCesfam}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* HOSPITAL */}
          {tipoCentro === 'hospital' && (
            <div style={{ marginBottom: '15px' }}>
              <label>Hospital:</label>

              <select
                name="idHospital"
                value={formData.idHospital}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">
                  Seleccione un Hospital
                </option>

                {hospitales.map((hospital) => (
                  <option
                    key={hospital.idHospital}
                    value={hospital.idHospital}
                  >
                    {hospital.nombreHospital}
                  </option>
                ))}
              </select>
            </div>
          )}

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
            {loading ? 'Creando...' : 'Crear Acceso'}
          </button>

        </form>
      </div>

      {/* LISTADO DE ACCESOS */}
      <div>
        <h3>Accesos Existentes</h3>

        {accesos.length === 0 ? (
          <p>
            No existen accesos registrados.
          </p>
        ) : (
          <div
            style={{
              overflowX: 'auto'
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}
            >
              <thead>
                <tr>
                  <th style={estiloTh}>Estado</th>
                  <th style={estiloTh}>Persona</th>
                  <th style={estiloTh}>ID Centro</th>
                  <th style={estiloTh}>Centro</th>
                  <th style={estiloTh}>Tipo</th>
                </tr>
              </thead>

              <tbody>
                {accesos.map((acceso, index) => (
                  <tr key={index}>

                    <td style={estiloTd}>
                      {acceso.activo === 'S'
                        ? 'Activo'
                        : 'Inactivo'}
                    </td>

                    <td style={estiloTd}>
                      {acceso.nombrePersona}
                    </td>

                    <td style={estiloTd}>
                      {acceso.idCentro}
                    </td>

                    <td style={estiloTd}>
                      {acceso.nombreCentro}
                    </td>

                    <td style={estiloTd}>
                      {acceso.tipoCentro}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const estiloTh = {
  border: '1px solid #ddd',
  padding: '10px',
  backgroundColor: '#f2f2f2',
  textAlign: 'left'
};

const estiloTd = {
  border: '1px solid #ddd',
  padding: '10px'
};

export default Accesos;