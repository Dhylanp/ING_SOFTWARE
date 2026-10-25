import { beforeEach, describe, expect, test } from 'vitest'
import { errorDeRed, errorHttp, mockApi } from '../test/utils'
import { getConCache, limpiarCatalogos } from './catalogos'

describe('catálogos con cache (HU19)', () => {
  beforeEach(() => localStorage.clear())

  test('sin red devuelve la última copia guardada', async () => {
    // Arrange
    mockApi({ 'GET /especialidad': [{ idEspecialidad: 1, nombreEspecialidad: 'Cardiología' }] })
    await getConCache('/especialidad')
    mockApi({ 'GET /especialidad': errorDeRed() })

    // Act
    const res = await getConCache('/especialidad')

    // Assert
    expect(res).toEqual({ data: [{ idEspecialidad: 1, nombreEspecialidad: 'Cardiología' }], desdeCache: true })
  })

  test('de los pacientes guarda solo lo mínimo para buscarlos (confidencialidad)', async () => {
    // Arrange
    mockApi({ 'GET /persona': [{ idPersona: 1, rut: 1, dv: 'K', nombrePersona: 'Ana', clave: 'hash', calle: 'X 1' }] })

    // Act
    await getConCache('/persona')

    // Assert
    expect(JSON.parse(localStorage.getItem('cat:/persona'))).toEqual([{ idPersona: 1, rut: 1, dv: 'K', nombrePersona: 'Ana' }])
  })

  test('un error del servidor no se tapa con la cache', async () => {
    // Arrange
    localStorage.setItem('cat:/hospital', JSON.stringify([{ idHospital: 1 }]))
    mockApi({ 'GET /hospital': errorHttp(500, 'Error interno') })

    // Act
    const promesa = getConCache('/hospital')

    // Assert
    await expect(promesa).rejects.toThrow('Error interno')
  })

  test('limpiarCatalogos borra solo las listas en cache', () => {
    // Arrange
    localStorage.setItem('cat:/persona', '[]')
    localStorage.setItem('token', 't')

    // Act
    limpiarCatalogos()

    // Assert
    expect(localStorage.getItem('cat:/persona')).toBeNull()
    expect(localStorage.getItem('token')).toBe('t')
  })
})
