import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { mockApi, renderPagina } from '../test/utils'
import InterconsultasDevueltas from './InterconsultasDevueltas'

describe('InterconsultasDevueltas (HU05A)', () => {
  test('"Ver motivo" muestra motivo, observaciones y hospital', async () => {
    // Arrange
    const user = userEvent.setup()
    const api = mockApi({
      'GET /formulario/filtrar': [{ idFormulario: 4, nombrePersona: 'Ana Pérez', nombreHospital: 'Hospital Uno', fechaInicio: '2026-10-01' }],
      'GET /formulario/4/devolucion': { motivo: 'Faltan exámenes', observaciones: '', hospital: 'Hospital Uno', fecha: '2026-10-02T10:00:00' },
    })
    renderPagina(<InterconsultasDevueltas />)

    // Act
    await user.click(await screen.findByRole('button', { name: 'Ver motivo de la interconsulta 4' }))

    // Assert
    const motivo = await screen.findByTestId('motivo-4')
    expect(motivo).toHaveTextContent('Faltan exámenes')
    expect(motivo).toHaveTextContent('Sin observaciones adicionales.')
    expect(motivo).toHaveTextContent('Hospital Uno')
    expect(api.get).toHaveBeenCalledWith('/formulario/filtrar', expect.objectContaining({ params: expect.objectContaining({ estados: '3' }) }))
  })
})
