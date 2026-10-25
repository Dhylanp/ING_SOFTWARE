import { useEffect, useState } from 'react';

const Tema = () => {
    const [tema, setTema] = useState(
        () => localStorage.getItem('tema') || 'light'
    );

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', tema);
        localStorage.setItem('tema', tema);
    }, [tema]);

    const alternar = () => setTema((t) => (t === 'light' ? 'dark' : 'light'));

    return (
        <button
            onClick={alternar}
            title={tema === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            aria-label="Cambiar entre modo claro y oscuro"
            style={{
                position: 'fixed',
                top: '15px',
                left: '15px',
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-h)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow)',
                cursor: 'pointer',
                zIndex: 1000,
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
            }}
        >
            {tema === 'light' ? '🌙' : '☀️'}
        </button>
    );
};

export default Tema;