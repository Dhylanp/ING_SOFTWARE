import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { avisos } from '../lib/avisos'
import { listarRegistros } from '../offline/almacen'
import { borrarAlmacenLocal, errorDeRed, mockApi, renderPagina } from '../test/utils'
import RegistrarInterconsulta from './RegistrarInterconsulta'

const catalogos = {
  'GET /persona': [{ idPersona: 7, rut: 12345678, dv: '5', nombrePersona: 'Ana Pérez' }],
  'GET /hospital/0': [{ idHospital: 1, nombreHospital: 'Hospital Uno' }],
  'GET /especialidad': [{ idEspecialidad: 1, nombreEspecialidad: 'Cardiología' }],
}

async function llenarFormulario(user, container) {
  await screen.findByRole('option', { name: 'Hospital Uno' })
  await screen.findByRole('option', { name: 'Cardiología' })
  await user.type(screen.getByPlaceholderText('Ej: 12345678-9'), '12345678-5')
  await user.selectOptions(container.querySelector('select[name=idHospital]'), '1')
  await user.selectOptions(container.querySelector('select[name=idEspecialidad]'), '1')
  await user.type(container.querySelector('textarea[name=descripcion]'), 'Dolor torácico')
}

describe('RegistrarInterconsulta (HU19)', () => {
  beforeEach(async () => {
    localStorage.clear()
    await borrarAlmacenLocal()
  })

  test('sin campos obligatorios no envía y avisa "Campos incompletos"', async () => {
    // Arrange
    const user = userEvent.setup()
    const api = mockApi(catalogos)
    const fire = vi.spyOn(avisos, 'fire').mockResolvedValue({})
    renderPagina(<RegistrarInterconsulta />)

    // Act
    await user.click(await screen.findByRole('button', { name: 'Guardar y emitir interconsulta' }))

    // Assert
    expect(fire).toHaveBeenCalledWith(expect.objectContaining({ title: 'Campos incompletos' }))
    expect(screen.getByText('Ingrese el RUT del paciente.')).toBeInTheDocument()
    expect(screen.getByText('Escriba el motivo de la derivación.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  test('sin conexión guarda en el dispositivo y avisa "Guardado sin conexión"', async () => {
    // Arrange
    const user = userEvent.setup()
    const api = mockApi(catalogos)
    const fire = vi.spyOn(avisos, 'fire').mockResolvedValue({})
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { container } = renderPagina(<RegistrarInterconsulta />)
    await llenarFormulario(user, container)

    // Act
    await user.click(screen.getByRole('button', { name: 'Guardar y emitir interconsulta' }))

    // Assert
    await vi.waitFor(() => expect(fire).toHaveBeenCalledWith(expect.objectContaining({ title: 'Guardado sin conexión' })))
    const registros = await listarRegistros()
    expect(registros).toHaveLength(1)
    expect(registros[0]).toMatchObject({ estado: 'pendiente', nombrePaciente: 'Ana Pérez', payload: { idPersona: 7, idCesfam: 1, idHospital: 1, idEspecialidad: 1 } })
    expect(api.post).not.toHaveBeenCalledWith('/formulario', expect.anything())
  })

  test('si la red se cae al enviar también lo guarda localmente', async () => {
    // Arrange
    const user = userEvent.setup()
    mockApi({ ...catalogos, 'POST /formulario': errorDeRed() })
    const fire = vi.spyOn(avisos, 'fire').mockResolvedValue({})
    const { container } = renderPagina(<RegistrarInterconsulta />)
    await llenarFormulario(user, container)

    // Act
    await user.click(screen.getByRole('button', { name: 'Guardar y emitir interconsulta' }))

    // Assert
    await vi.waitFor(() => expect(fire).toHaveBeenCalledWith(expect.objectContaining({ title: 'Guardado sin conexión' })))
    expect(await listarRegistros()).toHaveLength(1)
  })

  test('con conexión registra en el servidor', async () => {
    // Arrange
    const user = userEvent.setup()
    const api = mockApi({ ...catalogos, 'POST /formulario': { mensaje: 'ok' } })
    const fire = vi.spyOn(avisos, 'fire').mockResolvedValue({})
    const { container } = renderPagina(<RegistrarInterconsulta />)
    await llenarFormulario(user, container)

    // Act
    await user.click(screen.getByRole('button', { name: 'Guardar y emitir interconsulta' }))

    // Assert
    await vi.waitFor(() => expect(fire).toHaveBeenCalledWith(expect.objectContaining({ title: 'Interconsulta registrada' })))
    expect(api.post).toHaveBeenCalledWith('/formulario', expect.objectContaining({ idPersona: 7, descripcion: 'Dolor torácico', prioridad: expect.any(String) }))
    expect(await listarRegistros()).toHaveLength(0)
  })
})
