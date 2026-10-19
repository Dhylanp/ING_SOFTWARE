import { beforeEach, describe, expect, test } from 'vitest'
import { borrarAlmacenLocal, errorDeRed, errorHttp, mockApi } from '../test/utils'
import { guardarPendiente, listarRegistros } from './almacen'
import { sincronizarPendientes } from './sync'

describe('sincronizarPendientes (HU21)', () => {
  beforeEach(() => borrarAlmacenLocal())

  test('marca como sincronizado lo que el servidor aceptó, con su N° de interconsulta', async () => {
    // Arrange
    const r = await guardarPendiente({ payload: { idPersona: 1 } })
    const api = mockApi({
      'POST /sincronizar': (cuerpo) => ({
        sincronizados: 1,
        fallidos: 0,
        resultados: cuerpo.registros.map((p) => ({ uuidLocal: p.uuidLocal, estado: 'sincronizado', idFormulario: 99 })),
      }),
    })

    // Act
    const resumen = await sincronizarPendientes()

    // Assert
    expect(api.post).toHaveBeenCalledWith('/sincronizar', { registros: [{ idPersona: 1, uuidLocal: r.uuidLocal }] })
    expect(resumen).toEqual({ sincronizados: 1, fallidos: 0, total: 1 })
    expect((await listarRegistros())[0]).toMatchObject({ estado: 'sincronizado', idFormulario: 99 })
  })

  test('sin red conserva los registros como pendientes para reintentar', async () => {
    // Arrange
    await guardarPendiente({ payload: { idPersona: 1 } })
    mockApi({ 'POST /sincronizar': errorDeRed() })

    // Act
    const resumen = await sincronizarPendientes()

    // Assert
    expect(resumen.sinConexion).toBe(true)
    expect((await listarRegistros())[0].estado).toBe('pendiente')
  })

  test('con sesión vencida (401) no marca error: espera a que vuelva a iniciar sesión', async () => {
    // Arrange
    await guardarPendiente({ payload: { idPersona: 1 } })
    mockApi({ 'POST /sincronizar': errorHttp(401, 'Sesión inválida o expirada') })

    // Act
    const resumen = await sincronizarPendientes()

    // Assert
    expect(resumen.sesionExpirada).toBe(true)
    expect((await listarRegistros())[0].estado).toBe('pendiente')
  })

  test('si el servidor rechaza el envío deja el detalle del error en cada registro', async () => {
    // Arrange
    await guardarPendiente({ payload: { idPersona: 1 } })
    mockApi({ 'POST /sincronizar': errorHttp(422, 'Datos inválidos') })

    // Act
    const resumen = await sincronizarPendientes()

    // Assert
    expect(resumen).toEqual({ sincronizados: 0, fallidos: 1, total: 1 })
    expect((await listarRegistros())[0]).toMatchObject({ estado: 'error', detalle: 'Datos inválidos' })
  })

  test('sin pendientes no llama a la API', async () => {
    // Arrange
    const api = mockApi({})

    // Act
    const resumen = await sincronizarPendientes()

    // Assert
    expect(resumen.total).toBe(0)
    expect(api.post).not.toHaveBeenCalled()
  })
})
