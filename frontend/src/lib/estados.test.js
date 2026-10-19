import { describe, expect, test } from 'vitest'
import { CAUSALES_CIERRE, ESTADOS, nombreEstado, normalizarPrioridad } from './estados'

describe('estados del flujo', () => {
  test('define las seis etapas en orden', () => {
    expect(ESTADOS.map((e) => e.nombre)).toEqual([
      'Registrada', 'En lista de espera', 'Devuelta', 'Tramitada', 'Agendada', 'Finalizada',
    ])
  })

  test('nombreEstado traduce el id y tolera ids desconocidos', () => {
    expect(nombreEstado(3)).toBe('Devuelta')
    expect(nombreEstado('6')).toBe('Finalizada')
    expect(nombreEstado(99)).toBe('Desconocido')
  })

  test('las causales de cierre son exactamente las cinco de la HU09', () => {
    expect(CAUSALES_CIERRE).toEqual(['Atendido', 'Inasistencia', 'Rechazo', 'Fallecimiento', 'Retiro voluntario'])
  })

  test('normalizarPrioridad acepta texto o número y rechaza lo demás', () => {
    expect(normalizarPrioridad('ALTA')).toBe('alta')
    expect(normalizarPrioridad('2')).toBe('media')
    expect(normalizarPrioridad(3)).toBe('baja')
    expect(normalizarPrioridad('urgente')).toBeNull()
    expect(normalizarPrioridad(null)).toBeNull()
  })
})
