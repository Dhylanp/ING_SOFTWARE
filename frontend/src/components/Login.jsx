import { useState, useEffect } from 'react'

export default function LoginUser() {
    //renderizado condicional si esta cargando
    if (cargando) {
        return <p style={{ textAlign: 'center' }}>Cargando listado de interconsultas...</p>;
    }

    //renderizado condicional si hubo un error
    if (error) {
        return <p style={{ color: '#ff6b6b', textAlign: 'center' }}>Error: {error}</p>;
    }

    return (
        <div style={{ marginTop: '2rem' }}>
            <h2>Gestión de Listas de Espera</h2>
        </div>
    );
}