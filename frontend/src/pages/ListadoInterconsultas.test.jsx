import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ESTADOS } from '../lib/estados'
import { mockApi, renderPagina } from '../test/utils'
import ListadoInterconsultas from './ListadoInterconsultas'

describe('ListadoInterconsultas (HU07 estados)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('sin interconsultas muestra "Sin resultados"', async () => {
    // Arrange
    mockApi({ 'GET /especialidad': [], 'GET /formulario/filtrar': [] })

    // Act
    renderPagina(<ListadoInterconsultas />)

    // Assert
    expect(await screen.findByText('Sin resultados')).toBeInTheDocument()
  })

  test('muestra los 6 estados con su nombre y filtra por estado del CESFAM propio', async () => {
    // Arrange
    const user = userEvent.setup()
    const filas = ESTADOS.map((e) => ({ idFormulario: e.id, idEstado: e.id, nombreEstado: e.nombre, nombrePersona: 'Ana Pérez', prioridadClinica: 'media' }))
    const api = mockApi({ 'GET /especialidad': [], 'GET /formulario/filtrar': filas })
    renderPagina(<ListadoInterconsultas />)
    const tabla = await screen.findByRole('table')

    // Act
    await user.click(screen.getByRole('checkbox', { name: 'Devuelta' }))

    // Assert
    for (const e of ESTADOS) expect(within(tabla).getByText(e.nombre)).toBeInTheDocument()
    await vi.waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith('/formulario/filtrar', { params: { estados: '3', cesfam: 1 } })
    )
  })
})
