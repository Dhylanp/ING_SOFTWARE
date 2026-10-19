import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import EstadoBadge from '../components/EstadoBadge';
import { avisos, mensajeDeError } from '../lib/avisos';
import {
  E_DEVUELTA, E_FINALIZADA, E_LISTA_ESPERA, E_AGENDADA,
  PRIORIDADES, normalizarPrioridad,
} from '../lib/estados';
import { formatearFecha } from '../lib/fechas';
import { getConCache } from '../offline/catalogos';

const etiqueta = { display: 'block', fontWeight: 'bold', marginBottom: '5px' };
const bloque = { marginBottom: '15px' };
const campo = (error) => ({ width: '100%', ...(error ? { border: '1px solid var(--danger)' } : {}) });

// HU03 (modo "editar"): modificar SOLO datos administrativos.
// HU05B (modo "corregir"): corregir una interconsulta devuelta y reenviarla.
export default function EditarInterconsulta({ modo = 'editar' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const corrigiendo = modo === 'corregir';

  const [original, setOriginal] = useState(null);
  const [valores, setValores] = useState({ descripcion: '', prioridad: 'media', idEspecialidad: '', idHospital: '' });
  const [especialidades, setEspecialidades] = useState([]);
  const [hospitales, setHospitales] = useState([]);
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [det, esp, hos] = await Promise.all([
          api.get(`/formulario/${id}`),
          getConCache('/especialidad'),
          getConCache('/hospital/0'),
        ]);
        if (!activo) return;
        const f = det.data;
        setOriginal(f);
        setEspecialidades(esp.data);
        setHospitales(hos.data);
        setValores({
          descripcion: f.descripcion || '',
          prioridad: normalizarPrioridad(f.prioridadClinica) || 'media',
          idEspecialidad: String(f.idEspecialidad ?? ''),
          idHospital: String(f.idHospital ?? ''),
        });
      } catch (err) {
        if (activo) setErrorCarga(mensajeDeError(err, 'No se pudo cargar la interconsulta.'));
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [id]);

  const cambiar = (e) => {
    const { name, value } = e.target;
    setValores((v) => ({ ...v, [name]: value }));
    if (errores[name]) setErrores((er) => ({ ...er, [name]: '' }));
  };

  const validar = () => {
    const nuevos = {};
    if (!valores.descripcion.trim()) nuevos.descripcion = 'Escriba el motivo de la derivación.';
    if (!valores.idEspecialidad) nuevos.idEspecialidad = 'Seleccione la especialidad de destino.';
    if (!valores.idHospital) nuevos.idHospital = 'Seleccione un hospital de destino.';
    return nuevos;
  };

  // solo se envía lo que cambió
  const cambios = () => {
    const c = {};
    if (valores.descripcion.trim() !== (original.descripcion || '').trim()) c.descripcion = valores.descripcion.trim();
    if (valores.prioridad !== (normalizarPrioridad(original.prioridadClinica) || 'media')) c.prioridad = valores.prioridad;
    if (String(valores.idEspecialidad) !== String(original.idEspecialidad ?? '')) c.idEspecialidad = Number(valores.idEspecialidad);
    if (String(valores.idHospital) !== String(original.idHospital ?? '')) c.idHospital = Number(valores.idHospital);
    return c;
  };

  const guardar = async (e) => {
    e.preventDefault();
    const nuevos = validar();
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) {
      avisos.aviso('Campos incompletos', 'Hay campos pendientes o con errores. Revise los marcados en rojo.');
      return;
    }
    const c = cambios();

    if (!corrigiendo && Object.keys(c).length === 0) {
      setErrores({ general: 'No hay cambios para guardar.' });
      return;
    }

    setGuardando(true);
    try {
      if (corrigiendo) {
        const r = await api.post(`/formulario/${id}/reenviar`, c);
        await avisos.exito('Interconsulta reenviada', r.data.mensaje || 'La interconsulta quedó en estado Tramitada.');
        navigate('/interconsultas/devueltas');
      } else {
        await api.patch(`/formulario/${id}/administrativo`, c);
        await avisos.exito('Cambios guardados', 'Los datos administrativos fueron actualizados.');
        navigate('/interconsultas/listado'); // la grilla se vuelve a consultar con los datos nuevos
      }
    } catch (err) {
      avisos.error(corrigiendo ? 'No se pudo reenviar' : 'No se pudo guardar', mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const contenedor = { width: '100%', maxWidth: '800px', margin: '40px auto', padding: '20px', boxSizing: 'border-box' };

  if (cargando) return <div style={contenedor}><p>Cargando...</p></div>;
  if (errorCarga) {
    return (
      <div style={contenedor}>
        <p className="texto-error">{errorCarga}</p>
        <Link to="/interconsultas/listado">← Volver al listado</Link>
      </div>
    );
  }

  const idEstado = Number(original.idEstado);
  const volver = corrigiendo ? '/interconsultas/devueltas' : '/interconsultas/listado';

  let bloqueo = '';
  if (corrigiendo && idEstado !== E_DEVUELTA) bloqueo = 'Solo se pueden corregir y reenviar interconsultas en estado Devuelta.';
  if (!corrigiendo && idEstado === E_FINALIZADA) bloqueo = 'Una interconsulta finalizada no se puede modificar.';
  if (bloqueo) {
    return (
      <div style={contenedor}>
        <p role="alert">{bloqueo}</p>
        <Link to={volver}>← Volver</Link>
      </div>
    );
  }

  // el destino solo se cambia antes de que el hospital acepte el caso
  const destinoBloqueado = idEstado === E_LISTA_ESPERA || idEstado === E_AGENDADA;

  return (
    <div style={contenedor}>
      <Link to={volver}>← Volver</Link>
      <h2 style={{ marginTop: '16px' }}>
        {corrigiendo ? `Corregir y reenviar interconsulta #${id}` : `Modificar datos administrativos · #${id}`}
      </h2>

      {corrigiendo && (
        <div style={{ backgroundColor: 'var(--error-bg)', color: 'var(--error-text)', padding: '12px', borderRadius: '8px', marginBottom: '16px', textAlign: 'left' }}>
          <p><strong>Motivo de devolución:</strong> {original.motivoDevolucion || 'No informado'}</p>
          {original.observacionDevolucion && <p><strong>Observaciones:</strong> {original.observacionDevolucion}</p>}
        </div>
      )}

      <section aria-label="Datos que no se pueden editar" style={{ ...bloque, textAlign: 'left', backgroundColor: 'var(--surface-alt)', padding: '12px', borderRadius: '8px' }}>
        <p><strong>Paciente:</strong> {original.nombrePersona}</p>
        <p><strong>CESFAM de origen:</strong> {original.nombreCesfam}</p>
        <p><strong>Fecha de inicio:</strong> {formatearFecha(original.fechaInicio)}</p>
        <p><strong>Estado:</strong> <EstadoBadge idEstado={idEstado} nombre={original.nombreEstado} /></p>
      </section>

      <form onSubmit={guardar} noValidate style={{ textAlign: 'left' }}>
        <div style={bloque}>
          <label htmlFor="ed-hospital" style={etiqueta}>Hospital de destino (*):</label>
          <select id="ed-hospital" name="idHospital" value={valores.idHospital} onChange={cambiar} disabled={destinoBloqueado} style={campo(errores.idHospital)}>
            <option value="">Seleccione un hospital</option>
            {hospitales.map((h) => <option key={h.idHospital} value={h.idHospital}>{h.nombreHospital}</option>)}
          </select>
          {errores.idHospital && <small className="texto-error">{errores.idHospital}</small>}
        </div>

        <div style={bloque}>
          <label htmlFor="ed-especialidad" style={etiqueta}>Especialidad de destino (*):</label>
          <select id="ed-especialidad" name="idEspecialidad" value={valores.idEspecialidad} onChange={cambiar} disabled={destinoBloqueado} style={campo(errores.idEspecialidad)}>
            <option value="">Seleccione una especialidad</option>
            {especialidades.map((e) => <option key={e.idEspecialidad} value={e.idEspecialidad}>{e.nombreEspecialidad}</option>)}
          </select>
          {errores.idEspecialidad && <small className="texto-error">{errores.idEspecialidad}</small>}
          {destinoBloqueado && (
            <small style={{ display: 'block', color: 'var(--text-muted)' }}>
              El hospital y la especialidad no se pueden cambiar una vez aceptada la interconsulta.
            </small>
          )}
        </div>

        <div style={bloque}>
          <label htmlFor="ed-prioridad" style={etiqueta}>Prioridad clínica (*):</label>
          <select id="ed-prioridad" name="prioridad" value={valores.prioridad} onChange={cambiar} style={{ width: '100%' }}>
            {PRIORIDADES.map((p) => <option key={p.valor} value={p.valor}>{p.nombre}</option>)}
          </select>
        </div>

        <div style={bloque}>
          <label htmlFor="ed-descripcion" style={etiqueta}>Motivo de derivación (*):</label>
          <textarea id="ed-descripcion" name="descripcion" rows="4" maxLength={200} value={valores.descripcion} onChange={cambiar} style={campo(errores.descripcion)} />
          {errores.descripcion && <small className="texto-error">{errores.descripcion}</small>}
        </div>

        {errores.general && <p role="alert" className="texto-error" style={{ marginBottom: '10px' }}>{errores.general}</p>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" disabled={guardando} style={{ fontWeight: 'bold' }}>
            {guardando ? 'Guardando...' : corrigiendo ? 'Reenviar interconsulta' : 'Guardar cambios'}
          </button>
          <button type="button" className="btn-secundario" onClick={() => navigate(volver)}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
