import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { avisos } from '../lib/avisos'
import { mockApi, renderPagina } from '../test/utils'
import EditarInterconsulta from './EditarInterconsulta'

const formulario = (extra = {}) => ({
  idFormulario: 9, descripcion: 'Dolor', prioridadClinica: 'media', idEspecialidad: 1, idHospital: 1,
  idEstado: 4, nombreEstado: 'Tramitada', nombrePersona: 'Ana Pérez', nombreCesfam: 'CESFAM Norte', fechaInicio: '2026-10-01', ...extra,
})
const catalogos = {
  'GET /especialidad': [{ idEspecialidad: 1, nombreEspecialidad: 'Cardiología' }],
  'GET /hospital/0': [{ idHospital: 1, nombreHospital: 'Hospital Uno' }],
}
const editar = { path: '/interconsultas/:id/editar', ruta: '/interconsultas/9/editar' }

describe('EditarInterconsulta (HU03 / HU05B)', () => {
  beforeEach(() => localStorage.clear())

  test('envía solo los campos cambiados y vuelve al listado', async () => {
    // Arrange
    const user = userEvent.setup()
    const api = mockApi({ ...catalogos, 'GET /formulario/9': formulario(), 'PATCH /formulario/9/administrativo': {} })
    vi.spyOn(avisos, 'exito').mockResolvedValue({})
    renderPagina(<EditarInterconsulta />, editar)
    await user.selectOptions(await screen.findByLabelText('Prioridad clínica (*):'), 'alta')

    // Act
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    // Assert
    expect(await screen.findByTestId('ubicacion')).toHaveTextContent('/interconsultas/listado')
    expect(api.patch).toHaveBeenCalledWith('/formulario/9/administrativo', { prioridad: 'alta' })
  })

  test('sin cambios no llama a la API', async () => {
    // Arrange
    const user = userEvent.setup()
    const api = mockApi({ ...catalogos, 'GET /formulario/9': formulario() })
    renderPagina(<EditarInterconsulta />, editar)

    // Act
    await user.click(await screen.findByRole('button', { name: 'Guardar cambios' }))

    // Assert
    expect(screen.getByRole('alert')).toHaveTextContent('No hay cambios para guardar.')
    expect(api.patch).not.toHaveBeenCalled()
  })

  test('una interconsulta finalizada no se puede modificar', async () => {
    // Arrange
    mockApi({ ...catalogos, 'GET /formulario/9': formulario({ idEstado: 6, nombreEstado: 'Finalizada' }) })

    // Act
    renderPagina(<EditarInterconsulta />, editar)

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent('Una interconsulta finalizada no se puede modificar.')
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
  })

  test('modo corregir reenvía con POST y vuelve a devueltas', async () => {
    // Arrange
    const user = userEvent.setup()
    const api = mockApi({
      ...catalogos,
      'GET /formulario/9': formulario({ idEstado: 3, nombreEstado: 'Devuelta', motivoDevolucion: 'Faltan exámenes' }),
      'POST /formulario/9/reenviar': { mensaje: 'Reenviada' },
    })
    vi.spyOn(avisos, 'exito').mockResolvedValue({})
    renderPagina(<EditarInterconsulta modo="corregir" />, { path: '/interconsultas/:id/corregir', ruta: '/interconsultas/9/corregir' })
    const descripcion = await screen.findByLabelText('Motivo de derivación (*):')
    await user.clear(descripcion)
    await user.type(descripcion, 'Dolor con ECG adjunto')

    // Act
    await user.click(screen.getByRole('button', { name: 'Reenviar interconsulta' }))

    // Assert
    expect(await screen.findByTestId('ubicacion')).toHaveTextContent('/interconsultas/devueltas')
    expect(api.post).toHaveBeenCalledWith('/formulario/9/reenviar', { descripcion: 'Dolor con ECG adjunto' })
  })
})
