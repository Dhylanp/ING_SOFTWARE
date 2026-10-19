import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import ModalCierre from './ModalCierre'

describe('ModalCierre (HU09)', () => {
  test('ofrece las cinco causales', () => {
    render(<ModalCierre abierto onCerrar={() => {}} onConfirmar={() => {}} />)
    for (const causal of ['Atendido', 'Inasistencia', 'Rechazo', 'Fallecimiento', 'Retiro voluntario']) {
      expect(screen.getByRole('radio', { name: causal })).toBeInTheDocument()
    }
  })

  test('no se puede confirmar sin elegir una causal', async () => {
    const user = userEvent.setup()
    const onConfirmar = vi.fn()
    render(<ModalCierre abierto onCerrar={() => {}} onConfirmar={onConfirmar} />)
    await user.click(screen.getByRole('button', { name: 'Confirmar cierre' }))
    expect(screen.getByText('Seleccione una causal de cierre.')).toBeInTheDocument()
    expect(onConfirmar).not.toHaveBeenCalled()
  })

  test('confirma con la causal elegida', async () => {
    const user = userEvent.setup()
    const onConfirmar = vi.fn()
    render(<ModalCierre abierto onCerrar={() => {}} onConfirmar={onConfirmar} />)
    await user.click(screen.getByRole('radio', { name: 'Inasistencia' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar cierre' }))
    expect(onConfirmar).toHaveBeenCalledWith('Inasistencia')
  })

  test('cancelar cierra sin confirmar y cerrado no dibuja nada', async () => {
    const user = userEvent.setup()
    const onCerrar = vi.fn()
    const onConfirmar = vi.fn()
    const { rerender } = render(<ModalCierre abierto onCerrar={onCerrar} onConfirmar={onConfirmar} />)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCerrar).toHaveBeenCalledTimes(1)
    expect(onConfirmar).not.toHaveBeenCalled()
    rerender(<ModalCierre abierto={false} onCerrar={onCerrar} onConfirmar={onConfirmar} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
