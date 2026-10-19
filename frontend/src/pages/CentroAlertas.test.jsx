import { screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { mockApi, renderPagina } from '../test/utils'
import CentroAlertas from './CentroAlertas'

const item = { idFormulario: 4, nombrePersona: 'Ana Pérez', nombreHospital: 'Hospital Uno', fecha: '2026-10-02T10:00:00' }

describe('CentroAlertas (HU15)', () => {
  test('al abrir marca como revisadas las alertas nuevas', async () => {
    // Arrange
    const api = mockApi({
      'GET /alertas/devoluciones': { pendientes: 2, sinRevisar: 2, items: [item, { ...item, idFormulario: 5 }] },
      'POST /alertas/devoluciones/revisar': { revisadas: 2 },
    })

    // Act
    renderPagina(<CentroAlertas />)

    // Assert
    expect(await screen.findByRole('status')).toHaveTextContent('2 alertas nuevas fueron marcadas como revisadas.')
    expect(screen.getByTestId('contador-pendientes')).toHaveTextContent('2')
    expect(screen.getAllByTestId('alerta-item')).toHaveLength(2)
    expect(api.post).toHaveBeenCalledWith('/alertas/devoluciones/revisar')
  })

  test('si ya estaban revisadas no vuelve a marcarlas', async () => {
    // Arrange
    const api = mockApi({ 'GET /alertas/devoluciones': { pendientes: 1, sinRevisar: 0, items: [item] } })

    // Act
    renderPagina(<CentroAlertas />)

    // Assert
    expect(await screen.findByRole('status')).toHaveTextContent('Todas las alertas ya habían sido revisadas.')
    expect(api.post).not.toHaveBeenCalled()
  })
})
