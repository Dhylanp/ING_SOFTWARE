import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { mensajeDeError } from '../lib/avisos';
import { E_DEVUELTA } from '../lib/estados';
import { formatearFecha, formatearFechaHora } from '../lib/fechas';

const celda = { padding: '8px', border: '1px solid var(--border)', color: 'var(--text)' };
const encabezado = { ...celda, backgroundColor: 'var(--surface-alt)', color: 'var(--text-h)' };

// HU05A: grilla de interconsultas "Devuelta" con el motivo desplegable.
export default function InterconsultasDevueltas() {
  const { usuario } = useAuth();
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [abierta, setAbierta] = useState(null);       // id desplegado
  const [detalles, setDetalles] = useState({});        // id -> { cargando, error, datos }

  // limita la grilla a los CESFAM de la persona (si tiene uno solo se filtra directo en la API)
  const cesfams = (usuario?.accesos || []).filter((a) => Number(a.idRol) === 1 && a.tipoCentro === 'Cesfam');

  useEffect(() => {
    let activo = true;
    const params = { estados: String(E_DEVUELTA) };
    if (cesfams.length === 1) params.cesfam = cesfams[0].idCentro;
    api
      .get('/formulario/filtrar', { params })
      .then((r) => activo && setItems(Array.isArray(r.data) ? r.data : []))
      .catch((err) => {
        if (!activo) return;
        if (err.response?.status === 404) setItems([]);
        else setError(mensajeDeError(err, 'No se pudo cargar el listado de devueltas.'));
      })
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
    // cesfams se deriva del usuario de sesión, que no cambia en esta pantalla
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alternar = async (id) => {
    if (abierta === id) {
      setAbierta(null);
      return;
    }
    setAbierta(id);
    if (detalles[id]?.datos) return;
    setDetalles((d) => ({ ...d, [id]: { cargando: true } }));
    try {
      const r = await api.get(`/formulario/${id}/devolucion`);
      setDetalles((d) => ({ ...d, [id]: { datos: r.data } }));
    } catch (err) {
      setDetalles((d) => ({ ...d, [id]: { error: mensajeDeError(err, 'No se pudo obtener el motivo de devolución.') } }));
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '40px auto', padding: '20px', boxSizing: 'border-box' }}>
      <Link to="/interconsultas">← Volver al inicio</Link>
      <h2 style={{ marginTop: '16px' }}>Interconsultas devueltas</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
        Seleccione «Ver motivo» para conocer las observaciones del hospital y luego corrija y reenvíe el caso.
      </p>

      {cargando && <p>Cargando...</p>}
      {error && <p className="texto-error">{error}</p>}
      {!cargando && !error && items.length === 0 && <p>No hay interconsultas devueltas.</p>}

      {items.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--surface)', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={encabezado}>ID</th>
                <th style={encabezado}>Paciente</th>
                <th style={encabezado}>Especialidad</th>
                <th style={encabezado}>Hospital</th>
                <th style={encabezado}>Fecha de inicio</th>
                <th style={encabezado}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const id = i.idFormulario;
                const det = detalles[id];
                const expandida = abierta === id;
                return (
                  <Fragment key={id}>
                    <tr>
                      <td style={celda}>#{id}</td>
                      <td style={celda}>{i.nombrePersona}</td>
                      <td style={celda}>{i.nombreEspecialidad || 'No especificada'}</td>
                      <td style={celda}>{i.nombreHospital}</td>
                      <td style={celda}>{formatearFecha(i.fechaInicio)}</td>
                      <td style={{ ...celda, whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => alternar(id)}
                          aria-expanded={expandida}
                          aria-label={`${expandida ? 'Ocultar' : 'Ver'} motivo de la interconsulta ${id}`}
                        >
                          {expandida ? 'Ocultar motivo' : 'Ver motivo'}
                        </button>{' '}
                        <Link to={`/interconsultas/${id}/corregir`}>Corregir y reenviar</Link>
                      </td>
                    </tr>
                    {expandida && (
                      <tr>
                        <td colSpan={6} style={{ ...celda, backgroundColor: 'var(--error-bg)', color: 'var(--error-text)' }}>
                          {det?.cargando && 'Cargando motivo...'}
                          {det?.error && <span role="alert">{det.error}</span>}
                          {det?.datos && (
                            <div data-testid={`motivo-${id}`}>
                              <p><strong>Motivo de devolución:</strong> {det.datos.motivo}</p>
                              <p>
                                <strong>Observaciones del hospital:</strong>{' '}
                                {det.datos.observaciones || 'Sin observaciones adicionales.'}
                              </p>
                              <p style={{ fontSize: '14px' }}>
                                Devuelta por {det.datos.hospital} el {formatearFechaHora(det.datos.fecha)}
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
