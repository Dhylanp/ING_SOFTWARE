import { useEffect, useState } from 'react';

// true si el navegador cree tener internet; se actualiza solo al cambiar la red.
export default function useConexion() {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine !== false);

  useEffect(() => {
    const alConectar = () => setEnLinea(true);
    const alDesconectar = () => setEnLinea(false);
    window.addEventListener('online', alConectar);
    window.addEventListener('offline', alDesconectar);
    return () => {
      window.removeEventListener('online', alConectar);
      window.removeEventListener('offline', alDesconectar);
    };
  }, []);

  return enLinea;
}
