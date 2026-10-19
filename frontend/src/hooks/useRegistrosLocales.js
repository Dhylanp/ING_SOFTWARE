import { useCallback, useEffect, useState } from 'react';
import { EVENTO_CAMBIOS, listarRegistros } from '../offline/almacen';

// Lista los registros guardados en el dispositivo y se refresca cuando cambian.
export default function useRegistrosLocales() {
  const [registros, setRegistros] = useState([]);

  const recargar = useCallback(async () => {
    try {
      setRegistros(await listarRegistros());
    } catch (err) {
      console.warn('[offline] No se pudo leer el almacenamiento local:', err);
      setRegistros([]);
    }
  }, []);

  useEffect(() => {
    // la carga inicial es asíncrona (IndexedDB), no hay render en cascada
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recargar();
    window.addEventListener(EVENTO_CAMBIOS, recargar);
    return () => window.removeEventListener(EVENTO_CAMBIOS, recargar);
  }, [recargar]);

  return { registros, recargar };
}
