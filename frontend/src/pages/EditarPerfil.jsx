import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// -------------------------------------------------------------
// Validaciones (mismas reglas que valida la API)
// -------------------------------------------------------------
const RE_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const RE_TELEFONO = /^\d{9}$/;

const limpiarTelefono = (t) => String(t);

const formatearRut = (rut, dv) => {
  if (!rut) return '—';
  const conPuntos = String(rut).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${conPuntos}-${dv ?? ''}`;
};

const formatearFecha = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
};

const traerComunas = async (idRegion) => {
  try {
    const res = await api.get(`/comuna/${idRegion}`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    if (error.response?.status === 404) return [];
    throw error;
  }
};

// Normaliza un teléfono que venga de la API (string antiguo u objeto nuevo)
const normalizarTelefono = (t) => {
  if (typeof t === 'string') return { numero: t, tipo: 'P' };
  return { numero: String(t?.numero ?? ''), tipo: t?.tipo === 'E' ? 'E' : 'P' };
};

const EditarPerfil = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const idPersona = usuario?.idPersona;

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Datos de solo lectura
  const [fijos, setFijos] = useState(null);

  // Datos editables
  const [regiones, setRegiones] = useState([]);
  const [comunas, setComunas] = useState([]);
  const [idRegion, setIdRegion] = useState('');
  const [idComuna, setIdComuna] = useState('');
  const [calle, setCalle] = useState('');
  const [telefonos, setTelefonos] = useState([]); // [{ numero, tipo }]
  const [correos, setCorreos] = useState([]);

  // Campos de "agregar"
  const [nuevoTel, setNuevoTel] = useState('');
  const [nuevoTipoTel, setNuevoTipoTel] = useState('P');
  const [nuevoCorreo, setNuevoCorreo] = useState('');

  // Foto del estado guardado, para saber si hay cambios
  const [original, setOriginal] = useState('');

  const estadoActual = useMemo(
    () =>
      JSON.stringify({
        calle: calle.trim(),
        idComuna: String(idComuna),
        telefonos: telefonos.map((t) => ({ numero: t.numero, tipo: t.tipo })),
        correos
      }),
    [calle, idComuna, telefonos, correos]
  );
  const hayCambios = original !== '' && estadoActual !== original;

  // ---------------------------------------------------------
  // Carga inicial
  // ---------------------------------------------------------
  useEffect(() => {
    if (!idPersona) return;
    let activo = true;

    const cargar = async () => {
      try {
        const [resPerfil, resRegiones] = await Promise.all([
          api.get(`/persona/${idPersona}/perfil`),
          api.get('/region')
        ]);
        const p = resPerfil.data;
        const listaComunas = p.idRegion ? await traerComunas(p.idRegion) : [];

        if (!activo) return;

        const telefonosNormalizados = (p.telefonos || []).map(normalizarTelefono);

        setFijos({
          nombrePersona: p.nombrePersona,
          rut: p.rut,
          dv: p.dv,
          fechaNac: p.fechaNac
        });
        setRegiones(Array.isArray(resRegiones.data) ? resRegiones.data : []);
        setComunas(listaComunas);
        setIdRegion(p.idRegion ? String(p.idRegion) : '');
        setIdComuna(p.idComuna ? String(p.idComuna) : '');
        setCalle(p.calle || '');
        setTelefonos(telefonosNormalizados);
        setCorreos(p.correos || []);
        setOriginal(
          JSON.stringify({
            calle: (p.calle || '').trim(),
            idComuna: p.idComuna ? String(p.idComuna) : '',
            telefonos: telefonosNormalizados.map((t) => ({ numero: t.numero, tipo: t.tipo })),
            correos: p.correos || []
          })
        );
      } catch (error) {
        console.error('[EditarPerfil] Error al cargar:', error);
        const detalle = error.response?.data?.detail;
        Swal.fire({
          icon: 'error',
          title: 'No se pudo cargar tu información',
          text: typeof detalle === 'string' ? detalle : 'Intenta nuevamente en unos minutos.'
        });
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargar();
    return () => {
      activo = false;
    };
  }, [idPersona]);

  // ---------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------
  const cambiarRegion = async (valor) => {
    setIdRegion(valor);
    setIdComuna('');
    setComunas([]);
    if (!valor) return;
    try {
      setComunas(await traerComunas(valor));
    } catch (error) {
      console.error('[EditarPerfil] Error al cargar comunas:', error);
      Swal.fire({
        icon: 'error',
        title: 'No se pudieron cargar las comunas',
        text: 'Vuelve a elegir la región.'
      });
    }
  };

  const agregarTelefono = () => {
    const valor = limpiarTelefono(nuevoTel);
    if (!valor) return;
    if (!RE_TELEFONO.test(valor)) {
      Swal.fire({
        icon: 'error',
        title: 'Teléfono no válido',
        text: 'El teléfono debe tener exactamente 9 dígitos. No se permite +56 ni otros caracteres.'
      });
      return;
    }
    if (telefonos.some((t) => t.numero === valor)) {
      Swal.fire({ icon: 'info', title: 'Ese teléfono ya está en tu lista' });
      return;
    }
    setTelefonos((prev) => [...prev, { numero: valor, tipo: nuevoTipoTel }]);
    setNuevoTel('');
    setNuevoTipoTel('P');
  };

  const agregarCorreo = () => {
    const valor = nuevoCorreo.trim();
    if (!valor) return;
    if (!RE_CORREO.test(valor) || valor.length > 50) {
      Swal.fire({
        icon: 'warning',
        title: 'Correo no válido',
        text: 'Revisa el formato (nombre@dominio.cl). Máximo 50 caracteres.'
      });
      return;
    }
    if (correos.some((c) => c.toLowerCase() === valor.toLowerCase())) {
      Swal.fire({ icon: 'info', title: 'Ese correo ya está en tu lista' });
      return;
    }
    setCorreos((prev) => [...prev, valor]);
    setNuevoCorreo('');
  };

  const quitarTelefono = (numero) =>
    setTelefonos((prev) => prev.filter((t) => t.numero !== numero));
  const quitarCorreo = (valor) =>
    setCorreos((prev) => prev.filter((c) => c !== valor));

  const volver = async () => {
    if (hayCambios) {
      const r = await Swal.fire({
        icon: 'question',
        title: '¿Salir sin guardar?',
        text: 'Los cambios que hiciste se perderán.',
        showCancelButton: true,
        confirmButtonText: 'Salir sin guardar',
        cancelButtonText: 'Seguir editando'
      });
      if (!r.isConfirmed) return;
    }
    navigate(-1);
  };

  const guardar = async () => {
    if (nuevoTel.trim() || nuevoCorreo.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Hay datos sin agregar',
        text: 'Presiona "Agregar" en el teléfono o correo que escribiste, o bórralo.'
      });
      return;
    }
    if (!idComuna) {
      Swal.fire({ icon: 'warning', title: 'Elige tu región y comuna' });
      return;
    }
    if (!calle.trim()) {
      Swal.fire({ icon: 'warning', title: 'Escribe tu calle' });
      return;
    }

    const r = await Swal.fire({
      icon: 'question',
      title: '¿Guardar los cambios?',
      text: 'Se actualizarán tus datos de contacto.',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar'
    });
    if (!r.isConfirmed) return;

    setGuardando(true);
    try {
      await api.put(`/persona/${idPersona}/perfil`, {
        calle: calle.trim(),
        idComuna: Number(idComuna),
        telefonos: telefonos.map((t) => ({ numero: t.numero, tipo: t.tipo })),
        correos
      });
      setOriginal(estadoActual);
      Swal.fire({
        icon: 'success',
        title: 'Cambios guardados',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('[EditarPerfil] Error al guardar:', error);
      const detalle = error.response?.data?.detail;
      Swal.fire({
        icon: 'error',
        title: 'No se pudieron guardar los cambios',
        text: typeof detalle === 'string' ? detalle : 'Intenta nuevamente.'
      });
    } finally {
      setGuardando(false);
    }
  };

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------
  if (!idPersona) return null;

  return (
    <div
      style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '70px 16px 48px',
        color: 'var(--text)',
        textAlign: 'left'
      }}
    >
      <button type="button" onClick={volver} style={estiloVolver}>
        ← Volver
      </button>

      <h1 style={{ margin: '14px 0 4px', fontSize: '24px', color: 'var(--text-h)' }}>
        Editar información personal
      </h1>
      <p style={{ margin: '0 0 22px', color: 'var(--text-muted)', fontSize: '14px' }}>
        Puedes cambiar dónde vives y cómo contactarte. Los demás datos no se pueden modificar.
      </p>

      {cargando ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando tus datos…</p>
      ) : !fijos ? (
        <p style={{ color: 'var(--text-muted)' }}>No hay datos para mostrar.</p>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* Datos fijos */}
          <Bloque titulo="Datos que no se pueden cambiar">
            <CampoFijo etiqueta="Nombre" valor={fijos.nombrePersona} />
            <CampoFijo etiqueta="RUT" valor={formatearRut(fijos.rut, fijos.dv)} />
            <CampoFijo etiqueta="Fecha de nacimiento" valor={formatearFecha(fijos.fechaNac)} />
          </Bloque>

          {/* Residencia */}
          <Bloque titulo="Dónde vives">
            <label style={estiloEtiqueta} htmlFor="ep-region">Región</label>
            <select
              id="ep-region"
              value={idRegion}
              onChange={(e) => cambiarRegion(e.target.value)}
              style={estiloInput}
            >
              <option value="">Selecciona una región</option>
              {regiones.map((r) => (
                <option key={r.idRegion} value={r.idRegion}>
                  {r.nombreRegion}
                </option>
              ))}
            </select>

            <label style={estiloEtiqueta} htmlFor="ep-comuna">Comuna</label>
            <select
              id="ep-comuna"
              value={idComuna}
              onChange={(e) => setIdComuna(e.target.value)}
              disabled={!idRegion}
              style={{ ...estiloInput, opacity: idRegion ? 1 : 0.6 }}
            >
              <option value="">
                {idRegion ? 'Selecciona una comuna' : 'Primero elige una región'}
              </option>
              {comunas.map((c) => (
                <option key={c.idComuna} value={c.idComuna}>
                  {c.nombreComuna}
                </option>
              ))}
            </select>

            <label style={estiloEtiqueta} htmlFor="ep-calle">Calle y número</label>
            <input
              id="ep-calle"
              type="text"
              value={calle}
              maxLength={100}
              onChange={(e) => setCalle(e.target.value)}
              placeholder="Ej: Av. Libertad 1234"
              style={estiloInput}
            />
          </Bloque>

          {/* Teléfonos */}
          <Bloque titulo="Teléfonos">
            {telefonos.length === 0 && (
              <p style={estiloVacio}>No tienes teléfonos registrados.</p>
            )}
            {telefonos.map((t) => (
              <FilaDato
                key={t.numero}
                valor={t.numero}
                etiqueta={t.tipo === 'E' ? 'teléfono de emergencia' : 'teléfono personal'}
                badge={t.tipo === 'E' ? 'Emergencia' : 'Personal'}
                onQuitar={() => quitarTelefono(t.numero)}
              />
            ))}
            <div style={estiloFilaAgregar}>
              <select
                value={nuevoTipoTel}
                onChange={(e) => setNuevoTipoTel(e.target.value)}
                aria-label="Tipo de teléfono"
                style={{ ...estiloInput, margin: 0, width: '130px', flexShrink: 0 }}
              >
                <option value="P">Personal</option>
                <option value="E">Emergencia</option>
              </select>
              <input
                type="tel"
                maxLength={9}
                value={nuevoTel}
                onChange={(e) => setNuevoTel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarTelefono())}
                placeholder="912345678"
                aria-label="Nuevo teléfono"
                style={{ ...estiloInput, margin: 0, flex: 1 }}
              />
              <button type="button" onClick={agregarTelefono} style={estiloAgregar}>
                Agregar
              </button>
            </div>
          </Bloque>

          {/* Correos */}
          <Bloque titulo="Correos">
            {correos.length === 0 && (
              <p style={estiloVacio}>No tienes correos registrados.</p>
            )}
            {correos.map((c) => (
              <FilaDato key={c} valor={c} onQuitar={() => quitarCorreo(c)} etiqueta="correo" />
            ))}
            <div style={estiloFilaAgregar}>
              <input
                type="email"
                value={nuevoCorreo}
                onChange={(e) => setNuevoCorreo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarCorreo())}
                placeholder="nombre@dominio.cl"
                aria-label="Nuevo correo"
                style={{ ...estiloInput, margin: 0, flex: 1 }}
              />
              <button type="button" onClick={agregarCorreo} style={estiloAgregar}>
                Agregar
              </button>
            </div>
          </Bloque>

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={volver} style={estiloSecundario}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={!hayCambios || guardando}
              style={{
                ...estiloGuardar,
                opacity: !hayCambios || guardando ? 0.55 : 1,
                cursor: !hayCambios || guardando ? 'not-allowed' : 'pointer'
              }}
            >
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// Subcomponentes
// -------------------------------------------------------------
const Bloque = ({ titulo, children }) => (
  <section
    style={{
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '16px 18px',
      backgroundColor: 'var(--surface)'
    }}
  >
    <h2 style={{ margin: '0 0 12px', fontSize: '15px', color: 'var(--text-h)' }}>{titulo}</h2>
    {children}
  </section>
);

const CampoFijo = ({ etiqueta, valor }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '7px 0',
      fontSize: '14px',
      borderBottom: '1px dashed var(--border)'
    }}
  >
    <span style={{ color: 'var(--text-muted)' }}>{etiqueta}</span>
    <span style={{ color: 'var(--text-h)', textAlign: 'right' }}>{valor || '—'}</span>
  </div>
);

const ANCHO_BADGE = '104px'; // ancho fijo para alinear los números

const FilaDato = ({ valor, onQuitar, etiqueta, badge }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
      padding: '8px 12px',
      marginBottom: '6px',
      borderRadius: '8px',
      backgroundColor: 'var(--surface-alt)',
      fontSize: '14px'
    }}
  >
    <span style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
      {badge && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: ANCHO_BADGE,
            boxSizing: 'border-box',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '999px',
            backgroundColor: badge === 'Emergencia' ? 'var(--error-bg)' : 'var(--primary-soft)',
            color: badge === 'Emergencia' ? 'var(--error-text)' : 'var(--primary)',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}
        >
          {badge}
        </span>
      )}
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums'
        }}
        title={valor}
      >
        {valor}
      </span>
    </span>
    <button
      type="button"
      onClick={onQuitar}
      aria-label={`Quitar ${etiqueta} ${valor}`}
      style={{
        border: 'none',
        background: 'transparent',
        color: 'var(--danger-text)',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '13px',
        padding: '4px 6px',
        flexShrink: 0
      }}
    >
      Quitar
    </button>
  </div>
);

// -------------------------------------------------------------
// Estilos
// -------------------------------------------------------------
const estiloEtiqueta = {
  display: 'block',
  fontSize: '13px',
  color: 'var(--text-muted)',
  margin: '10px 0 4px'
};

const estiloInput = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: '9px 11px',
  fontSize: '14px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--surface)',
  color: 'var(--text-h)'
};

const estiloFilaAgregar = { display: 'flex', gap: '8px', marginTop: '10px' };

const estiloAgregar = {
  padding: '9px 16px',
  borderRadius: '8px',
  border: '1px solid var(--primary)',
  backgroundColor: 'transparent',
  color: 'var(--primary)',
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'pointer'
};

const estiloVacio = { margin: '0 0 6px', fontSize: '13px', color: 'var(--text-muted)' };

const estiloVolver = {
  border: 'none',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: '14px',
  padding: 0
};

const estiloSecundario = {
  padding: '10px 18px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--surface)',
  color: 'var(--text-h)',
  fontWeight: 600,
  fontSize: '14px',
  cursor: 'pointer'
};

const estiloGuardar = {
  padding: '10px 20px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: 'var(--primary)',
  color: 'var(--on-primary)',
  fontWeight: 600,
  fontSize: '14px'
};

export default EditarPerfil;