import { beforeEach, describe, expect, test } from 'vitest'
import { borrarAlmacenLocal } from '../test/utils'
import {
  actualizarRegistro,
  borrarMeta,
  eliminarSincronizados,
  guardarMeta,
  guardarPendiente,
  leerMeta,
  listarRegistros,
} from './almacen'

describe('almacen IndexedDB (HU19)', () => {
  beforeEach(() => borrarAlmacenLocal())

  test('guarda la interconsulta como pendiente y copia el uuidLocal en el payload', async () => {
    // Arrange
    const payload = { idPersona: 7, descripcion: 'Dolor torácico' }

    // Act
    const registro = await guardarPendiente({ payload, nombrePaciente: 'Ana Pérez' })
    const registros = await listarRegistros()

    // Assert
    expect(registros).toHaveLength(1)
    expect(registros[0]).toMatchObject({ estado: 'pendiente', nombrePaciente: 'Ana Pérez' })
    expect(registros[0].payload.uuidLocal).toBe(registro.uuidLocal)
  })

  test('actualizarRegistro cambia el estado y eliminarSincronizados borra solo los sincronizados', async () => {
    // Arrange
    const enviado = await guardarPendiente({ payload: { idPersona: 1 } })
    await guardarPendiente({ payload: { idPersona: 2 } })

    // Act
    await actualizarRegistro(enviado.uuidLocal, { estado: 'sincronizado', idFormulario: 40 })
    await eliminarSincronizados()

    // Assert
    const quedan = await listarRegistros()
    expect(quedan).toHaveLength(1)
    expect(quedan[0]).toMatchObject({ estado: 'pendiente', payload: { idPersona: 2 } })
  })

  test('guarda, lee y borra datos de sesión para el Service Worker', async () => {
    // Arrange
    await guardarMeta('token', 'abc')

    // Act
    const leido = await leerMeta('token')
    await borrarMeta('token')

    // Assert
    expect(leido).toBe('abc')
    expect(await leerMeta('token')).toBeNull()
  })
})
