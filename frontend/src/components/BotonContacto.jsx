import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../api/axios';

// -------------------------------------------------------------
// Helper: copia texto al portapapeles
// -------------------------------------------------------------
const copiarAlPortapapeles = async (texto) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = texto;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch (err) {
    console.error('[BotonContacto] Error al copiar:', err);
    return false;
  }
};

// -------------------------------------------------------------
// Parseo de teléfonos: soporta "912345678" o "912345678:P"
// -------------------------------------------------------------
const parsearTelefono = (raw) => {
  if (!raw) return null;
  const texto = String(raw).trim();
  if (!texto) return null;

  const idx = texto.lastIndexOf(':');
  if (idx > 0) {
    const numero = texto.slice(0, idx).trim();
    const tipoRaw = texto.slice(idx + 1).trim().toUpperCase();
    const tipo = tipoRaw === 'E' ? 'E' : 'P';
    if (numero) return { numero, tipo };
  }
  return { numero: texto, tipo: 'P' };
};

const ANCHO_BADGE = '104px'; // ancho fijo para alinear los números

const BotonContacto = ({ idPersona, nombrePersona }) => {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [datos, setDatos] = useState(null);

  const abrirModal = async () => {
    if (!idPersona) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin persona',
        text: 'No se especificó la persona para consultar sus contactos.'
      });
      return;
    }

    setAbierto(true);
    setCargando(true);
    setDatos(null);

    try {
      const res = await api.get(`/contactos/${idPersona}`);
      const lista = Array.isArray(res.data) ? res.data : [];
      setDatos(lista[0] || null);
    } catch (error) {
      console.error('[BotonContacto] Error:', error);
      const status = error.response?.status;
      const detalle = error.response?.data?.detail;

      if (status === 404) {
        setDatos(null);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text:
            typeof detalle === 'string'
              ? detalle
              : 'No se pudieron cargar los datos de contacto.'
        });
        setAbierto(false);
      }
    } finally {
      setCargando(false);
    }
  };

  const cerrarModal = () => {
    setAbierto(false);
    setDatos(null);
  };

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e) => {
      if (e.key === 'Escape') cerrarModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto]);

  const separar = (valor) => {
    if (!valor) return [];
    return String(valor)
      .split(';')
      .map((v) => v.trim())
      .filter(Boolean);
  };

  const telefonos = separar(datos?.Contactos)
    .map(parsearTelefono)
    .filter(Boolean);
  const correos = separar(datos?.Correos);

  return (
    <>
      {/* Círculo con ícono de teléfono */}
      <button
        type="button"
        onClick={abrirModal}
        title="Ver datos de contacto"
        aria-label="Ver datos de contacto"
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          color: 'var(--primary)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          transition:
            'transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.backgroundColor = 'var(--surface-alt)';
          e.currentTarget.style.boxShadow = '0 4px 10px var(--shadow)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.backgroundColor = 'var(--surface)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="currentColor"
        >
          <path
            d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24
               3.09 3.09 0 0 0 3.87 3.87 1 1 0 0 1 .24 1.02l-2.2 2.2a1
               1 0 0 1-1.04.24A19 19 0 0 1 3.2 4.7a1 1 0 0 1 .24-1.04l2.2-2.2a1
               1 0 0 1 1.02-.24 3.09 3.09 0 0 0 3.87 3.87 1 1 0 0 1 .24 1.02Z"
          />
        </svg>
      </button>

      {/* Modal */}
      {abierto && (
        <div
          onClick={cerrarModal}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'color-mix(in srgb, var(--text-h) 55%, transparent)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '460px',
              maxHeight: '88vh',
              overflow: 'hidden',
              boxShadow: 'var(--shadow)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 22px',
                background:
                  'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                color: 'var(--on-primary)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: 'color-mix(in srgb, var(--on-primary) 22%, transparent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="currentColor"
                  >
                    <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 3.09 3.09 0 0 0 3.87 3.87 1 1 0 0 1 .24 1.02l-2.2 2.2a1 1 0 0 1-1.04.24A19 19 0 0 1 3.2 4.7a1 1 0 0 1 .24-1.04l2.2-2.2a1 1 0 0 1 1.02-.24 3.09 3.09 0 0 0 3.87 3.87 1 1 0 0 1 .24 1.02Z" />
                  </svg>
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '17px',
                      color: 'inherit',
                      fontWeight: 600
                    }}
                  >
                    Datos de contacto
                  </h3>
                  {nombrePersona && (
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '12.5px',
                        opacity: 0.85
                      }}
                    >
                      {nombrePersona}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                aria-label="Cerrar"
                style={{
                  border: 'none',
                  background: 'color-mix(in srgb, var(--on-primary) 18%, transparent)',
                  color: 'inherit',
                  fontSize: '20px',
                  lineHeight: 1,
                  cursor: 'pointer',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    'color-mix(in srgb, var(--on-primary) 30%, transparent)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    'color-mix(in srgb, var(--on-primary) 18%, transparent)')
                }
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div
              style={{
                padding: '20px 22px',
                overflowY: 'auto'
              }}
            >
              {cargando && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px 0',
                    color: 'var(--text-muted)'
                  }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      border: '3px solid var(--border)',
                      borderTopColor: 'var(--primary)',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                      marginBottom: '12px'
                    }}
                  />
                  <span style={{ fontSize: '13px' }}>Cargando datos...</span>
                </div>
              )}

              {!cargando && !datos && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '30px 10px',
                    color: 'var(--text-muted)'
                  }}
                >
                  <div
                    style={{
                      fontSize: '36px',
                      marginBottom: '10px',
                      opacity: 0.5
                    }}
                  >
                    📭
                  </div>
                  <p style={{ margin: 0, fontSize: '14px' }}>
                    No se encontraron datos de contacto para esta persona.
                  </p>
                </div>
              )}

              {!cargando && datos && (
                <div style={{ display: 'grid', gap: '14px' }}>
                  {/* Bloque Ubicación */}
                  <Seccion titulo="Ubicación" icono={<IconoPin />}>
                    <Fila etiqueta="Dirección" valor={datos.calle || '—'} />
                    <Fila etiqueta="Comuna" valor={datos.Comuna || '—'} />
                    <Fila etiqueta="Región" valor={datos.Region || '—'} />
                  </Seccion>

                  {/* Bloque Teléfonos */}
                  <Seccion titulo="Teléfonos" icono={<IconoTelefono />}>
                    {telefonos.length === 0 ? (
                      <span
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: '13px'
                        }}
                      >
                        Sin teléfonos registrados
                      </span>
                    ) : (
                      telefonos.map((tel, i) => (
                        <div
                          key={`${tel.numero}-${i}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--surface-alt)',
                            marginBottom: '6px'
                          }}
                        >
                          <Badge tipo={tel.tipo} />
                          <a
                            href={`tel:${tel.numero.replace(/\s/g, '')}`}
                            style={{
                              color: 'var(--text-h)',
                              textDecoration: 'none',
                              fontSize: '13.5px',
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontVariantNumeric: 'tabular-nums'
                            }}
                            title={tel.numero}
                          >
                            {tel.numero}
                          </a>
                          <BotonCopiar valor={tel.numero} etiqueta="teléfono" />
                        </div>
                      ))
                    )}
                  </Seccion>

                  {/* Bloque Correos */}
                  <Seccion titulo="Correos" icono={<IconoCorreo />}>
                    {correos.length === 0 ? (
                      <span
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: '13px'
                        }}
                      >
                        Sin correos registrados
                      </span>
                    ) : (
                      correos.map((correo, i) => (
                        <div
                          key={`${correo}-${i}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--surface-alt)',
                            marginBottom: '6px'
                          }}
                        >
                          <a
                            href={`mailto:${correo}`}
                            style={{
                              color: 'var(--primary)',
                              textDecoration: 'none',
                              fontSize: '13.5px',
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={correo}
                          >
                            {correo}
                          </a>
                          <BotonCopiar valor={correo} etiqueta="correo" />
                        </div>
                      ))
                    )}
                  </Seccion>
                </div>
              )}
            </div>

            {/* Footer */}
            {!cargando && (
              <div
                style={{
                  padding: '12px 22px',
                  borderTop: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-alt)',
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}
              >
                <button
                  type="button"
                  onClick={cerrarModal}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-h)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px'
                  }}
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
};

// -------------------------------------------------------------
// Subcomponentes de presentación
// -------------------------------------------------------------
const Seccion = ({ titulo, icono, children }) => (
  <div
    style={{
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '14px',
      backgroundColor: 'var(--surface)'
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '10px',
        color: 'var(--text-h)',
        fontWeight: 600,
        fontSize: '13px'
      }}
    >
      <span style={{ color: 'var(--primary)', display: 'flex' }}>{icono}</span>
      {titulo}
    </div>
    <div>{children}</div>
  </div>
);

const Fila = ({ etiqueta, valor }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '6px 0',
      fontSize: '13.5px',
      borderBottom: '1px dashed var(--border)'
    }}
  >
    <span style={{ color: 'var(--text-muted)' }}>{etiqueta}</span>
    <span style={{ color: 'var(--text-h)', textAlign: 'right' }}>{valor}</span>
  </div>
);

const Badge = ({ tipo }) => {
  const esEmergencia = tipo === 'E';
  return (
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
        backgroundColor: esEmergencia ? 'var(--error-bg)' : 'var(--primary-soft)',
        color: esEmergencia ? 'var(--error-text)' : 'var(--primary)',
        flexShrink: 0,
        whiteSpace: 'nowrap'
      }}
    >
      {esEmergencia ? 'Emergencia' : 'Personal'}
    </span>
  );
};

const BotonCopiar = ({ valor, etiqueta }) => {
  const [copiado, setCopiado] = useState(false);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const ok = await copiarAlPortapapeles(valor);

    if (ok) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1200);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo copiar',
        text: 'Tu navegador bloqueó el acceso al portapapeles.',
        timer: 1800,
        showConfirmButton: false
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={copiado ? '¡Copiado!' : `Copiar ${etiqueta}`}
      aria-label={`Copiar ${etiqueta}`}
      style={{
        border: 'none',
        background: 'transparent',
        color: copiado ? 'var(--primary)' : 'var(--text-muted)',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '6px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'color 0.15s ease, background-color 0.15s ease',
        flexShrink: 0
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--border)';
        e.currentTarget.style.color = 'var(--primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = copiado ? 'var(--primary)' : 'var(--text-muted)';
      }}
    >
      {copiado ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z" />
        </svg>
      )}
    </button>
  );
};

const IconoPin = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
  </svg>
);

const IconoTelefono = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 3.09 3.09 0 0 0 3.87 3.87 1 1 0 0 1 .24 1.02l-2.2 2.2a1 1 0 0 1-1.04.24A19 19 0 0 1 3.2 4.7a1 1 0 0 1 .24-1.04l2.2-2.2a1 1 0 0 1 1.02-.24 3.09 3.09 0 0 0 3.87 3.87 1 1 0 0 1 .24 1.02Z" />
  </svg>
);

const IconoCorreo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
  </svg>
);

export default BotonContacto;