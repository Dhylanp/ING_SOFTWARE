import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { avisos } from '../lib/avisos'
import { mockApi, renderPagina, USUARIO_ESPECIALISTA } from '../test/utils'
import BandejaEspecialista from './BandejaEspecialista'

const bandeja = [{ idFormulario: 8, nombrePersona: 'Ana Pérez', nombreCesfam: 'CESFAM Norte', fechaInicio: '2026-10-01', idEstado: 4, nombreEstado: 'Tramitada', prioridadClinica: 'alta' }]

describe('BandejaEspecialista (HU07 / HU23)', () => {
  test('aceptar pide confirmación y envía la revisión', async () => {
    // Arrange
    const user = userEvent.setup()
    const api = mockApi({ 'GET /especialista/bandeja': bandeja, 'POST /formulario/8/revision': { mensaje: 'Aceptada' } })
    const confirmar = vi.spyOn(avisos, 'confirmar').mockResolvedValue(true)
    const exito = vi.spyOn(avisos, 'exito').mockResolvedValue({})
    renderPagina(<BandejaEspecialista />, { usuario: USUARIO_ESPECIALISTA })

    // Act
    await user.click(await screen.findByRole('button', { name: 'Aceptar interconsulta 8' }))

    // Assert
    expect(confirmar).toHaveBeenCalled()
    await vi.waitFor(() => expect(exito).toHaveBeenCalledWith('Interconsulta aceptada', 'Aceptada'))
    expect(api.post).toHaveBeenCalledWith('/formulario/8/revision', { accion: 'aceptar' })
  })

  test('si no confirma, no acepta', async () => {
    // Arrange
    const user = userEvent.setup()
    const api = mockApi({ 'GET /especialista/bandeja': bandeja })
    vi.spyOn(avisos, 'confirmar').mockResolvedValue(false)
    renderPagina(<BandejaEspecialista />, { usuario: USUARIO_ESPECIALISTA })

    // Act
    await user.click(await screen.findByRole('button', { name: 'Aceptar interconsulta 8' }))

    // Assert
    expect(api.post).not.toHaveBeenCalled()
  })

  test('devolver exige motivo y luego envía motivo y observaciones', async () => {
    // Arrange
    const user = userEvent.setup()
    const api = mockApi({ 'GET /especialista/bandeja': bandeja, 'POST /formulario/8/revision': { mensaje: 'Devuelta' } })
    vi.spyOn(avisos, 'exito').mockResolvedValue({})
    renderPagina(<BandejaEspecialista />, { usuario: USUARIO_ESPECIALISTA })
    await user.click(await screen.findByRole('button', { name: 'Devolver interconsulta 8' }))

    // Act
    await user.click(screen.getByRole('button', { name: 'Devolver interconsulta' }))
    const alerta = await screen.findByRole('alert')
    const textoAlerta = alerta.textContent
    await user.type(screen.getByLabelText('Motivo de devolución (*):'), 'Faltan exámenes')
    await user.type(screen.getByLabelText('Observaciones (opcional):'), 'Adjuntar ECG')
    await user.click(screen.getByRole('button', { name: 'Devolver interconsulta' }))

    // Assert
    expect(textoAlerta).toBe('El motivo de devolución es obligatorio.')
    await vi.waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/formulario/8/revision', { accion: 'devolver', motivo: 'Faltan exámenes', observaciones: 'Adjuntar ECG' })
    )
    expect(api.post).toHaveBeenCalledTimes(1)
  })
})
