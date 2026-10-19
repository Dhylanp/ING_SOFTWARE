import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, test } from 'vitest'
import { mockApi, renderPagina, USUARIO_ESPECIALISTA } from '../test/utils'
import DetalleInterconsulta from './DetalleInterconsulta'

const ficha = (extra = {}) => ({
  idFormulario: 9, descripcion: 'Dolor', prioridadClinica: 'media', idEstado: 2, nombreEstado: 'En lista de espera',
  nombrePersona: 'Ana Pérez', nombreHospital: 'Hospital Uno', fechaInicio: '2026-10-01', ...extra,
})
const historial = [
  { idHistorial: 1, idEstado: 4, nombreEstado: 'Tramitada', fecha: '2026-10-01T09:00:00', nombrePersona: 'Admin CESFAM' },
  { idHistorial: 2, idEstado: 2, nombreEstado: 'En lista de espera', fecha: '2026-10-02T09:00:00', nombrePersona: 'Dra. Especialista' },
]
const detalle = { path: '/interconsultas/:id', ruta: '/interconsultas/9' }

describe('DetalleInterconsulta (HU07)', () => {
  beforeEach(() => localStorage.clear())

  test('muestra la línea de tiempo y las acciones según rol y estado', async () => {
    // Arrange
    mockApi({ 'GET /formulario/9': ficha(), 'GET /formulario/9/historial': historial, 'GET /formulario/9/documentos': [] })

    // Act
    renderPagina(<DetalleInterconsulta />, detalle)

    // Assert
    expect(await screen.findAllByTestId('evento-historial')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Modificar datos administrativos' })).toBeInTheDocument()
  })

  test('el especialista no ve la edición administrativa', async () => {
    // Arrange
    mockApi({ 'GET /formulario/9': ficha(), 'GET /formulario/9/historial': historial, 'GET /formulario/9/documentos': [] })

    // Act
    renderPagina(<DetalleInterconsulta />, { ...detalle, usuario: USUARIO_ESPECIALISTA })

    // Assert
    expect(await screen.findAllByTestId('evento-historial')).toHaveLength(2)
    expect(screen.queryByRole('link', { name: 'Modificar datos administrativos' })).not.toBeInTheDocument()
  })

  test('finalizada no ofrece acciones', async () => {
    // Arrange
    mockApi({ 'GET /formulario/9': ficha({ idEstado: 6, nombreEstado: 'Finalizada' }), 'GET /formulario/9/historial': [], 'GET /formulario/9/documentos': [] })

    // Act
    renderPagina(<DetalleInterconsulta />, detalle)

    // Assert
    expect(await screen.findByText('Interconsulta #9')).toBeInTheDocument()
    await screen.findAllByText('Finalizada')
    expect(screen.queryByRole('link', { name: 'Modificar datos administrativos' })).not.toBeInTheDocument()
  })

})
