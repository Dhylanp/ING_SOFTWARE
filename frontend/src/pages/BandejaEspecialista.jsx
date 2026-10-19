import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import EstadoBadge from '../components/EstadoBadge';
import ModalDevolucion from '../components/ModalDevolucion';
import { avisos, mensajeDeError } from '../lib/avisos';
import { normalizarPrioridad } from '../lib/estados';
import { formatearFecha } from '../lib/fechas';

const nombresPrioridad = { alta: 'Alta', media: 'Media', baja: 'Baja' };
const estilosPrioridad = {
  alta: { backgroundColor: 'var(--error-bg)', color: 'var(--error-text)' },
  media: { backgroundColor: 'var(--warning-bg)', color: 'var(--warning-text)' },
  baja: { backgroundColor: 'var(--success-bg)', color: 'var(--success-text)' },
};
const celda = { padding: '8px', border: '1px solid var(--border)', color: 'var(--text)' };
const encabezado = { ...celda, backgroundColor: 'var(--surface-alt)', color: 'var(--text-h)' };

// HU23: bandeja del especialista con acciones aceptar / devolver.
export default function BandejaEspecialista() {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [paraDevolver, setParaDevolver] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await api.get('/especialista/bandeja');
      setItems(Array.isArray(r.data) ? r.data : []);
      setError('');
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo cargar la bandeja de revisión.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // carga inicial asíncrona de la bandeja
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const aceptar = async (item) => {
    const ok = await avisos.confirmar(
      `¿Aceptar la interconsulta #${item.idFormulario}?`,
      'Quedará en lista de espera y se avisará al CESFAM de origen.',
      'Sí, aceptar'
    );
    if (!ok) return;
    setEnviando(true);
    try {
      const r = await api.post(`/formulario/${item.idFormulario}/revision`, { accion: 'aceptar' });
      await avisos.exito('Interconsulta aceptada', r.data.mensaje);
      await cargar();
    } catch (err) {
      avisos.error('No se pudo aceptar', mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const devolver = async ({ motivo, observaciones }) => {
    setEnviando(true);
    try {
      const r = await api.post(`/formulario/${paraDevolver.idFormulario}/revision`, {
        accion: 'devolver',
        motivo,
        observaciones: observaciones || null,
      });
      setParaDevolver(null);
      await avisos.exito('Interconsulta devuelta', r.data.mensaje);
      await cargar();
    } catch (err) {
      avisos.error('No se pudo devolver', mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1400px', margin: '40px auto', padding: '20px', boxSizing: 'border-box' }}>
      <Link to="/interconsultas">← Volver al inicio</Link>
      <h2 style={{ marginTop: '16px' }}>Bandeja de revisión</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
        Interconsultas derivadas a su hospital que esperan ser aceptadas o devueltas. Las más urgentes aparecen primero.
      </p>

      {cargando && <p>Cargando...</p>}
      {error && <p className="texto-error">{error}</p>}
      {!cargando && !error && items.length === 0 && <p>No hay interconsultas pendientes de revisión.</p>}

      {items.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--surface)', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={encabezado}>ID</th>
                <th style={encabezado}>Paciente</th>
                <th style={encabezado}>Especialidad</th>
                <th style={encabezado}>CESFAM de origen</th>
                <th style={encabezado}>Fecha</th>
                <th style={encabezado}>Prioridad</th>
                <th style={encabezado}>Estado</th>
                <th style={encabezado}>Motivo</th>
                <th style={encabezado}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const p = normalizarPrioridad(i.prioridadClinica);
                return (
                  <tr key={i.idFormulario}>
                    <td style={celda}>
                      <Link to={`/interconsultas/${i.idFormulario}`}>#{i.idFormulario}</Link>
                    </td>
                    <td style={celda}>{i.nombrePersona}</td>
                    <td style={celda}>{i.nombreEspecialidad || 'No especificada'}</td>
                    <td style={celda}>{i.nombreCesfam}</td>
                    <td style={celda}>{formatearFecha(i.fechaInicio)}</td>
                    <td style={celda}>
                      {p && (
                        <span style={{ ...estilosPrioridad[p], padding: '2px 10px', borderRadius: '999px', fontSize: '13px', fontWeight: 'bold' }}>
                          {nombresPrioridad[p]}
                        </span>
                      )}
                    </td>
                    <td style={celda}><EstadoBadge idEstado={i.idEstado} nombre={i.nombreEstado} /></td>
                    <td style={celda}>{i.descripcion}</td>
                    <td style={{ ...celda, whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => aceptar(i)}
                        disabled={enviando}
                        aria-label={`Aceptar interconsulta ${i.idFormulario}`}
                      >
                        Aceptar
                      </button>{' '}
                      <button
                        type="button"
                        className="btn-peligro"
                        onClick={() => setParaDevolver(i)}
                        disabled={enviando}
                        aria-label={`Devolver interconsulta ${i.idFormulario}`}
                      >
                        Devolver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ModalDevolucion
        abierto={Boolean(paraDevolver)}
        onCerrar={() => setParaDevolver(null)}
        onConfirmar={devolver}
        enviando={enviando}
      />
    </div>
  );
}
