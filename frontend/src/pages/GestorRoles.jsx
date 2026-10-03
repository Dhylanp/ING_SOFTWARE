import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import LoadingOverlay from '../components/LoadingOverlay';
import api from '../api/axios';

const Accesos = () => {
  const [accesos, setAccesos] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [cesfams, setCesfams] = useState([]);
  const [hospitales, setHospitales] = useState([]);

  const [tipoCentro, setTipoCentro] = useState('');
  const [loading, setLoading] = useState(false);

  const roles = [
    {
      idRol: 1,
      nombreRol: 'Admin'
    },
    {
      idRol: 2,
      nombreRol: 'Externo'
    },
    {
      idRol: 4,
      nombreRol: 'Administrador de Roles'
    }
  ];

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
      const [personasRes, cesfamsRes, hospitalesRes] =
        await Promise.allSettled([
          api.get('/persona'),
          api.get('/cesfam/0'),
          api.get('/hospital/0')
        ]);

      if (personasRes.status === 'fulfilled') {
        setPersonas(
          Array.isArray(personasRes.value.data)
            ? personasRes.value.data
            : []
        );
      } else {
        console.warn(
          'GET /persona no disponible en el backend:',
          personasRes.reason
        );
        setPersonas([]);
      }

      if (cesfamsRes.status === 'fulfilled') {
        setCesfams(
          Array.isArray(cesfamsRes.value.data)
            ? cesfamsRes.value.data
            : []
        );
      } else {
        console.warn(
          'GET /cesfam/0 falló:',
          cesfamsRes.reason
        );
        setCesfams([]);
      }

      if (hospitalesRes.status === 'fulfilled') {
        setHospitales(
          Array.isArray(hospitalesRes.value.data)
            ? hospitalesRes.value.data
            : []
        );
      } else {
        console.warn(
          'GET /hospital/0 falló:',
          hospitalesRes.reason
        );
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
      const res = await api.get('/Acceso/0/0/0/0');

      setAccesos(
        Array.isArray(res.data)
          ? res.data
          : []
      );
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

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRolChange = (e) => {
    const idRol = Number(e.target.value);

    let nuevoTipoCentro = '';

    if (idRol === 1) {
      nuevoTipoCentro = 'cesfam';
    } else if (idRol === 2) {
      nuevoTipoCentro = 'hospital';
    }

    setTipoCentro(nuevoTipoCentro);

    setFormData((prev) => ({
      ...prev,
      idRol: e.target.value,
      idCesfam: '',
      idHospital: ''
    }));
  };

  const handleTipoCentro = (e) => {
    const value = e.target.value;

    if (Number(formData.idRol) !== 4) {
      return;
    }

    setTipoCentro(value);

    setFormData((prev) => ({
      ...prev,
      idCesfam: '',
      idHospital: ''
    }));
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
        text: 'Seleccione un tipo de centro.'
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
      const response = await api.post('/acceso', payload);

      const data = response.data;

      Swal.fire({
        icon: 'success',
        title: 'Acceso creado',
        text:
          data.mensaje ||
          'El acceso fue creado correctamente.'
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
      const status = error.response?.status;

      let mensaje = 'No se pudo crear el acceso.';

      if (typeof detalle === 'string') {
        mensaje = detalle;
      }

      if (status === 409) {
        Swal.fire({
          icon: 'info',
          title: 'Acceso duplicado',
          text: mensaje
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: mensaje
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const eliminarAcceso = async (acceso) => {
    const resultado = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar acceso?',
      text: `Se eliminará el acceso de ${acceso.nombrePersona}.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d'
    });

    if (!resultado.isConfirmed) {
      return;
    }

    setLoading(true);

    try {
      const idPersona = Number(acceso.idPersona);
      const idRol = Number(acceso.idRol);
      const idCesfam = Number(acceso.idCesfam ?? 0);
      const idHospital = Number(acceso.idHospital ?? 0);

      await api.delete(
        `/acceso/${idPersona}/${idRol}/${idCesfam}/${idHospital}`
      );

      Swal.fire({
        icon: 'success',
        title: 'Acceso eliminado',
        text: 'El acceso fue eliminado correctamente.'
      });

      await cargarAccesos();
    } catch (error) {
      console.error(error);

      const detalle = error.response?.data?.detail;
      const status = error.response?.status;

      let mensaje = 'No se pudo eliminar el acceso.';

      if (typeof detalle === 'string') {
        mensaje = detalle;
      }

      if (status === 404) {
        Swal.fire({
          icon: 'info',
          title: 'Acceso no encontrado',
          text: 'Ese acceso ya no existe o los datos no coinciden.'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: mensaje
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const obtenerNombreRol = (idRol) => {
    const rol = roles.find(
      (item) => item.idRol === Number(idRol)
    );

    return rol
      ? rol.nombreRol
      : 'Desconocido';
  };

  const rolSeleccionado = Number(formData.idRol);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1100px',
        margin: '40px auto',
        padding: '30px',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <LoadingOverlay
        visible={loading}
        texto="Cargando..."
      />

      <h2>Administración de Accesos</h2>

      <div
        style={{
          border: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '30px'
        }}
      >
        <h3>Crear Acceso</h3>

        <form onSubmit={handleSubmit}>

          <div style={{ marginBottom: '15px' }}>
            <label>Persona:</label>

            <select
              name="idPersona"
              value={formData.idPersona}
              onChange={handleChange}
              style={{ width: '100%' }}
            >
              <option value="">
                Seleccione una persona
              </option>

              {personas.map((persona) => (
                <option
                  key={persona.idPersona}
                  value={persona.idPersona}
                >
                  {persona.nombrePersona} - {persona.rut}-{persona.dv}
                </option>
              ))}
            </select>

            {personas.length === 0 && (
              <small className="texto-error">
                No se pudieron cargar las personas.
              </small>
            )}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Rol:</label>

            <select
              name="idRol"
              value={formData.idRol}
              onChange={handleRolChange}
              style={{ width: '100%' }}
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

          <div style={{ marginBottom: '15px' }}>
            <label>Tipo de Centro:</label>

            <select
              value={tipoCentro}
              onChange={handleTipoCentro}
              disabled={rolSeleccionado !== 4}
              style={{
                width: '100%',
                backgroundColor:
                  rolSeleccionado !== 4
                    ? 'var(--surface-alt)'
                    : 'var(--surface)',
                color:
                  rolSeleccionado !== 4
                    ? 'var(--text-muted)'
                    : 'var(--text-h)',
                cursor:
                  rolSeleccionado !== 4
                    ? 'not-allowed'
                    : 'pointer'
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

          {tipoCentro === 'cesfam' && (
            <div style={{ marginBottom: '15px' }}>
              <label>CESFAM:</label>

              <select
                name="idCesfam"
                value={formData.idCesfam}
                onChange={handleChange}
                style={{ width: '100%' }}
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

              {cesfams.length === 0 && (
                <small className="texto-error">
                  No se pudieron cargar los CESFAM.
                </small>
              )}
            </div>
          )}

          {tipoCentro === 'hospital' && (
            <div style={{ marginBottom: '15px' }}>
              <label>Hospital:</label>

              <select
                name="idHospital"
                value={formData.idHospital}
                onChange={handleChange}
                style={{ width: '100%' }}
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

              {hospitales.length === 0 && (
                <small className="texto-error">
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
              fontWeight: 'bold'
            }}
          >
            {loading
              ? 'Creando...'
              : 'Crear Acceso'}
          </button>
        </form>
      </div>

      <div>
        <h3>Accesos Existentes</h3>

        {accesos.length === 0 ? (
          <p>
            No existen accesos registrados.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'var(--surface)'
              }}
            >
              <thead>
                <tr>
                  <th style={estiloTh}>
                    Estado
                  </th>

                  <th style={estiloTh}>
                    Persona
                  </th>

                  <th style={estiloTh}>
                    Rol
                  </th>

                  <th style={estiloTh}>
                    ID Centro
                  </th>

                  <th style={estiloTh}>
                    Centro
                  </th>

                  <th style={estiloTh}>
                    Tipo
                  </th>

                  <th style={estiloTh}>
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody>
                {accesos.map((acceso, index) => (
                  <tr
                    key={`${acceso.idPersona}-${acceso.idRol}-${acceso.idCesfam || 0}-${acceso.idHospital || 0}-${index}`}
                  >
                    <td style={estiloTd}>
                      {acceso.activo === 'S'
                        ? 'Activo'
                        : 'Inactivo'}
                    </td>

                    <td style={estiloTd}>
                      {acceso.nombrePersona}
                    </td>

                    <td style={estiloTd}>
                      {obtenerNombreRol(
                        acceso.idRol
                      )}
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

                    <td
                      style={{
                        ...estiloTd,
                        textAlign: 'center'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          eliminarAcceso(acceso)
                        }
                        title="Eliminar acceso"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--danger-text)',
                          fontSize: '20px',
                          cursor: 'pointer',
                          padding: '5px 10px'
                        }}
                      >
                        🗑️
                      </button>
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
  border: '1px solid var(--border)',
  padding: '10px',
  backgroundColor: 'var(--surface-alt)',
  color: 'var(--text-h)',
  textAlign: 'left'
};

const estiloTd = {
  border: '1px solid var(--border)',
  padding: '10px',
  color: 'var(--text)'
};

export default Accesos;