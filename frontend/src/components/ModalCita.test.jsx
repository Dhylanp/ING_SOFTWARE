import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import ModalCita from './ModalCita'

const diaMas = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('en-CA')
}

describe('ModalCita (HU17)', () => {
  test('exige fecha y hora', async () => {
    const user = userEvent.setup()
    const onConfirmar = vi.fn()
    render(<ModalCita abierto onCerrar={() => {}} onConfirmar={onConfirmar} />)
    await user.click(screen.getByRole('button', { name: 'Asignar hora' }))
    expect(screen.getByText('Indique la fecha de la cita.')).toBeInTheDocument()
    expect(screen.getByText('Indique la hora de la cita.')).toBeInTheDocument()
    expect(onConfirmar).not.toHaveBeenCalled()
  })

  test('rechaza una fecha pasada', async () => {
    const user = userEvent.setup()
    const onConfirmar = vi.fn()
    render(<ModalCita abierto onCerrar={() => {}} onConfirmar={onConfirmar} />)
    fireEvent.change(screen.getByLabelText('Fecha (*):'), { target: { value: diaMas(-2) } })
    fireEvent.change(screen.getByLabelText('Hora (*):'), { target: { value: '09:30' } })
    await user.click(screen.getByRole('button', { name: 'Asignar hora' }))
    expect(screen.getByText('La fecha no puede ser anterior a hoy.')).toBeInTheDocument()
    expect(onConfirmar).not.toHaveBeenCalled()
  })

  test('entrega fecha, hora y centro', async () => {
    const user = userEvent.setup()
    const onConfirmar = vi.fn()
    render(<ModalCita abierto onCerrar={() => {}} onConfirmar={onConfirmar} centroSugerido="Hospital Uno" />)
    const fecha = diaMas(5)
    fireEvent.change(screen.getByLabelText('Fecha (*):'), { target: { value: fecha } })
    fireEvent.change(screen.getByLabelText('Hora (*):'), { target: { value: '10:15' } })
    await user.click(screen.getByRole('button', { name: 'Asignar hora' }))
    expect(onConfirmar).toHaveBeenCalledWith({ fecha, hora: '10:15', centro: 'Hospital Uno' })
  })
})
