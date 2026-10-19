// Único lugar que usa SweetAlert2. Las pantallas llaman a `avisos.*`, lo que
// permite probarlas sin abrir ventanas reales (vi.spyOn(avisos, 'exito')).
import Swal from 'sweetalert2';

export const avisos = {
  // acceso directo a SweetAlert2 para los avisos con opciones propias
  fire: (opciones) => Swal.fire(opciones),
  exito: (titulo, texto) => Swal.fire({ icon: 'success', title: titulo, text: texto }),
  error: (titulo, texto) => Swal.fire({ icon: 'error', title: titulo, text: texto }),
  aviso: (titulo, texto) => Swal.fire({ icon: 'warning', title: titulo, text: texto }),
  info: (titulo, texto) => Swal.fire({ icon: 'info', title: titulo, text: texto }),
  // devuelve true si la persona confirma
  confirmar: async (titulo, texto, textoConfirmar = 'Sí, continuar') => {
    const r = await Swal.fire({
      icon: 'question',
      title: titulo,
      text: texto,
      showCancelButton: true,
      confirmButtonText: textoConfirmar,
      cancelButtonText: 'Cancelar',
    });
    return Boolean(r.isConfirmed);
  },
};

// Saca el mensaje legible de un error de axios (FastAPI manda `detail`)
export const mensajeDeError = (err, porDefecto = 'Error al procesar la solicitud') => {
  const detalle = err?.response?.data?.detail;
  if (typeof detalle === 'string') return detalle;
  if (Array.isArray(detalle) && detalle[0]?.msg) return detalle[0].msg;
  return porDefecto;
};
