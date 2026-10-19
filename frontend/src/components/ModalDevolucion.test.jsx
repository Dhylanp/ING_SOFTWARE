import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import ModalDevolucion from './ModalDevolucion'

describe('ModalDevolucion (HU23)', () => {
  test('exige el motivo de devolución', async () => {
    const user = userEvent.setup()
    const onConfirmar = vi.fn()
    render(<ModalDevolucion abierto onCerrar={() => {}} onConfirmar={onConfirmar} />)
    await user.type(screen.getByLabelText('Motivo de devolución (*):'), '   ')
    await user.click(screen.getByRole('button', { name: 'Devolver interconsulta' }))
    expect(screen.getByText('El motivo de devolución es obligatorio.')).toBeInTheDocument()
    expect(onConfirmar).not.toHaveBeenCalled()
  })

  test('envía motivo y observaciones sin espacios sobrantes', async () => {
    const user = userEvent.setup()
    const onConfirmar = vi.fn()
    render(<ModalDevolucion abierto onCerrar={() => {}} onConfirmar={onConfirmar} />)
    await user.type(screen.getByLabelText('Motivo de devolución (*):'), '  Falta examen  ')
    await user.type(screen.getByLabelText('Observaciones (opcional):'), 'Adjuntar hemograma')
    await user.click(screen.getByRole('button', { name: 'Devolver interconsulta' }))
    expect(onConfirmar).toHaveBeenCalledWith({ motivo: 'Falta examen', observaciones: 'Adjuntar hemograma' })
  })
})
