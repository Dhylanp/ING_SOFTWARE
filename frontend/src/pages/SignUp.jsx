import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const SignUp = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    rut: '',
    dv: '',
    nombrePersona: '',
    clave: '',
    fechaNac: '',
    calle: '',
    idComuna: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Auto-formateo de la fecha a dd/mm/aaaa
    if (name === 'fechaNac') {
      // Quitar todo lo que no sea número
      const soloNumeros = value.replace(/\D/g, '').slice(0, 8);

      let formateada = '';

      if (soloNumeros.length <= 2) {
        formateada = soloNumeros;
      } else if (soloNumeros.length <= 4) {
        formateada = `${soloNumeros.slice(0, 2)}/${soloNumeros.slice(2)}`;
      } else {
        formateada = `${soloNumeros.slice(0, 2)}/${soloNumeros.slice(2, 4)}/${soloNumeros.slice(4)}`;
      }

      setFormData({
        ...formData,
        fechaNac: formateada
      });

      return;
    }

    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Convierte dd/mm/aaaa a formato ISO YYYY-MM-DD
  const convertirFecha = (fecha) => {
    const partes = fecha.split('/');

    if (partes.length !== 3) {
      return null;
    }

    const [dia, mes, anio] = partes;

    if (dia.length !== 2 || mes.length !== 2 || anio.length !== 4) {
      return null;
    }

    const diaNum = Number(dia);
    const mesNum = Number(mes);
    const anioNum = Number(anio);

    if (isNaN(diaNum) || isNaN(mesNum) || isNaN(anioNum)) {
      return null;
    }

    // Validar rango del año (por ejemplo, entre 1900 y el año actual)
    const anioActual = new Date().getFullYear();
    if (anioNum < 1900 || anioNum > anioActual) {
      return null;
    }

    if (mesNum < 1 || mesNum > 12) {
      return null;
    }

    if (diaNum < 1) {
      return null;
    }

    // Días máximos por mes (considerando años bisiestos)
    const esBisiesto =
      (anioNum % 4 === 0 && anioNum % 100 !== 0) || anioNum % 400 === 0;

    const diasPorMes = [31, esBisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    if (diaNum > diasPorMes[mesNum - 1]) {
      return null;
    }

    // Formato ISO que espera FastAPI
    return `${anio}-${mes}-${dia}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.rut ||
      !formData.dv ||
      !formData.nombrePersona ||
      !formData.clave ||
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

    const fechaConvertida = convertirFecha(formData.fechaNac);

    if (!fechaConvertida) {
      Swal.fire({
        icon: 'error',
        title: 'Fecha incorrecta',
        text: 'Ingrese la fecha en formato dd/mm/aaaa (ej: 15/03/1990).'
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

    console.log('Datos enviados:', payload);

    try {
      const response = await fetch(
        'https://21jfmx87-8000.brs.devtunnels.ms/persona',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (data && data.codigo === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'RUT ya registrado',
          text: data.mensaje || 'Ya existe un Usuario asignado a ese RUT.'
        });

        return;
      }

      if (!response.ok) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.detail || 'No se pudo crear el usuario.'
        });

        return;
      }

      if (data && data.codigo === 1) {
        await Swal.fire({
          icon: 'success',
          title: 'Usuario creado',
          text: data.mensaje || 'El usuario fue creado correctamente.',
          confirmButtonText: 'Aceptar'
        });

        navigate('/login');
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Respuesta inesperada',
          text: data.mensaje || 'No se pudo crear el usuario.'
        });
      }

    } catch (error) {
      console.error('Error conectando con la API:', error);

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
      <h2>Crear Usuario como Paciente</h2>

      <p style={{ color: '#555' }}>
        Complete los siguientes datos para crear su cuenta.
      </p>

      <form onSubmit={handleSubmit}>

        <div style={{ marginBottom: '15px' }}>
          <label>RUT:</label>
          <input
            type="number"
            name="rut"
            value={formData.rut}
            onChange={handleChange}
            placeholder="Ej: 22079779"
            style={{
              width: '100%',
              padding: '8px',
              boxSizing: 'border-box'
            }}
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
            style={{
              width: '100%',
              padding: '8px',
              boxSizing: 'border-box'
            }}
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
            style={{
              width: '100%',
              padding: '8px',
              boxSizing: 'border-box'
            }}
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
            style={{
              width: '100%',
              padding: '8px',
              boxSizing: 'border-box'
            }}
          />
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
            style={{
              width: '100%',
              padding: '8px',
              boxSizing: 'border-box'
            }}
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
            style={{
              width: '100%',
              padding: '8px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>ID Comuna:</label>
          <input
            type="number"
            name="idComuna"
            value={formData.idComuna}
            onChange={handleChange}
            placeholder="Ej: 1"
            style={{
              width: '100%',
              padding: '8px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#0056b3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Crear Usuario
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