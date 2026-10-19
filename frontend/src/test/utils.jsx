import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import api from '../api/axios'

// Muestra la ruta actual: sirve para comprobar a dónde navegó una pantalla.
function Ubicacion() {
  const { pathname } = useLocation()
  return <p data-testid="ubicacion">{pathname}</p>
}

export const USUARIO_ADMIN = {
  idPersona: 3,
  rut: 11111111,
  nombrePersona: 'Admin CESFAM',
  idRol: 1,
  accesos: [{ idRol: 1, idCesfam: 1, idHospital: 0, tipoCentro: 'Cesfam', nombreCentro: 'CESFAM Norte', idCentro: 1 }],
}

export const USUARIO_ESPECIALISTA = {
  idPersona: 5,
  rut: 22222222,
  nombrePersona: 'Dra. Especialista',
  idRol: 2,
  accesos: [{ idRol: 2, idCesfam: 0, idHospital: 1, tipoCentro: 'Hospital', nombreCentro: 'Hospital Uno', idCentro: 1 }],
}

/**
 * Renderiza una pantalla con sesión iniciada y router.
 *   renderPagina(<MiPagina />, { path: '/interconsultas/:id', ruta: '/interconsultas/7', usuario })
 */
export function renderPagina(ui, { path = '/', ruta = '/', usuario = USUARIO_ADMIN } = {}) {
  localStorage.setItem('usuario', JSON.stringify(usuario))
  localStorage.setItem('token', 'token-de-prueba')
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={<Ubicacion />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )
}

/**
 * Simula la API sin red. `tabla` mapea "MÉTODO /ruta" a una respuesta, a una función
 * (recibe el cuerpo o los params) o a un Error para simular fallos.
 *   mockApi({ 'GET /especialidad': [{ idEspecialidad: 1, nombreEspecialidad: 'Cardiología' }] })
 */
export function mockApi(tabla) {
  const manejar = (metodo) => async (url, segundo, tercero) => {
    const clave = `${metodo} ${url}`
    if (!(clave in tabla)) {
      const err = new Error(`Sin respuesta simulada para ${clave}`)
      err.response = { status: 404, data: { detail: 'No encontrado' } }
      throw err
    }
    let valor = tabla[clave]
    if (typeof valor === 'function') valor = valor(metodo === 'GET' ? segundo?.params : segundo, tercero)
    valor = await valor
    if (valor instanceof Error) throw valor
    return { status: 200, data: valor }
  }
  return {
    get: vi.spyOn(api, 'get').mockImplementation(manejar('GET')),
    post: vi.spyOn(api, 'post').mockImplementation(manejar('POST')),
    patch: vi.spyOn(api, 'patch').mockImplementation(manejar('PATCH')),
    put: vi.spyOn(api, 'put').mockImplementation(manejar('PUT')),
  }
}

// Error como los que devuelve axios cuando FastAPI responde con un código HTTP
export const errorHttp = (status, detail) => {
  const err = new Error(detail)
  err.response = { status, data: { detail } }
  return err
}

// Error de red: la petición salió pero no hubo respuesta
export const errorDeRed = () => new Error('Network Error')
