import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import LoadingOverlay from '../components/LoadingOverlay';
import api from '../api/axios';

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
      // NOTA: el backend actual NO tiene GET /persona ni GET /rol.
      // Se intentan de todos modos; si fallan, se dejan vacíos.
      const [personasRes, rolesRes, cesfamsRes, hospitalesRes] =
        await Promise.allSettled([
          api.get('/persona'),
          api.get('/rol'),
          api.get('/cesfam/0'),
          api.get('/hospital/0')
        ]);

      if (personasRes.status === 'fulfilled') {
        setPersonas(
          Array.isArray(personasRes.value.data) ? personasRes.value.data : []
        );
      } else {
        console.warn('GET /persona no disponible en el backend:', personasRes.reason);
        setPersonas([]);
      }

      if (rolesRes.status === 'fulfilled') {
        setRoles(Array.isArray(rolesRes.value.data) ? rolesRes.value.data : []);
      } else {
        console.warn('GET /rol no disponible en el backend:', rolesRes.reason);
        setRoles([]);
      }

      if (cesfamsRes.status === 'fulfilled') {
        setCesfams(
          Array.isArray(cesfamsRes.value.data) ? cesfamsRes.value.data : []
        );
      } else {
        console.warn('GET /cesfam/0 falló:', cesfamsRes.reason);
        setCesfams([]);
      }

      if (hospitalesRes.status === 'fulfilled') {
        setHospitales(
          Array.isArray(hospitalesRes.value.data) ? hospitalesRes.value.data : []
        );
      } else {
        console.warn('GET /hospital/0 falló:', hospitalesRes.reason);
        setHospitales([]);
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
      const res = await api.get('/Acceso/0/0/0/0');
      setAccesos(Array.isArray(res.data) ? res.data : []);
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
    setFormData({
      ...formData,
      idCesfam: '',
      idHospital: ''
    });
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
      idCesfam: tipoCentro === 'cesfam' ? Number(formData.idCesfam) : 0,
      idHospital: tipoCentro === 'hospital' ? Number(formData.idHospital) : 0,
      idPersona: Number(formData.idPersona),
      idRol: Number(formData.idRol)
    };

    setLoading(true);

    try {
      const response = await api.post('/acceso', payload);
      const data = response.data;

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
      const detalle = error.response?.data?.detail;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          typeof detalle === 'string'
            ? detalle
            : 'No se pudo crear el acceso.'
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
      <LoadingOverlay visible={loading} texto="Cargando..." />

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
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            >
              <option value="">Seleccione una persona</option>
              {personas.map((persona) => (
                <option key={persona.idPersona} value={persona.idPersona}>
                  {persona.nombrePersona} - RUT {persona.rut}-{persona.dv}
                </option>
              ))}
            </select>
            {personas.length === 0 && (
              <small style={{ color: '#c00' }}>
                No se pudieron cargar las personas (endpoint GET /persona no existe en el backend).
              </small>
            )}
          </div>

          {/* ROL */}
          <div style={{ marginBottom: '15px' }}>
            <label>Rol:</label>
            <select
              name="idRol"
              value={formData.idRol}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            >
              <option value="">Seleccione un rol</option>
              {roles.map((rol) => (
                <option key={rol.idRol} value={rol.idRol}>
                  {rol.nombreRol}
                </option>
              ))}
            </select>
            {roles.length === 0 && (
              <small style={{ color: '#c00' }}>
                No se pudieron cargar los roles (endpoint GET /rol no existe en el backend).
              </small>
            )}
          </div>

          {/* TIPO DE CENTRO */}
          <div style={{ marginBottom: '15px' }}>
            <label>Tipo de Centro:</label>
            <select
              value={tipoCentro}
              onChange={handleTipoCentro}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            >
              <option value="">Seleccione un tipo</option>
              <option value="cesfam">CESFAM</option>
              <option value="hospital">Hospital</option>
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
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              >
                <option value="">Seleccione un CESFAM</option>
                {cesfams.map((cesfam) => (
                  <option key={cesfam.idCesfam} value={cesfam.idCesfam}>
                    {cesfam.nombreCesfam}
                  </option>
                ))}
              </select>
              {cesfams.length === 0 && (
                <small style={{ color: '#c00' }}>
                  No se pudieron cargar los CESFAM.
                </small>
              )}
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
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              >
                <option value="">Seleccione un Hospital</option>
                {hospitales.map((hospital) => (
                  <option key={hospital.idHospital} value={hospital.idHospital}>
                    {hospital.nombreHospital}
                  </option>
                ))}
              </select>
              {hospitales.length === 0 && (
                <small style={{ color: '#c00' }}>
                  No se pudieron cargar los hospitales.
                </small>
              )}
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
          <p>No existen accesos registrados.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                      {acceso.activo === 'S' ? 'Activo' : 'Inactivo'}
                    </td>
                    <td style={estiloTd}>{acceso.nombrePersona}</td>
                    <td style={estiloTd}>{acceso.idCentro}</td>
                    <td style={estiloTd}>{acceso.nombreCentro}</td>
                    <td style={estiloTd}>{acceso.tipoCentro}</td>
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