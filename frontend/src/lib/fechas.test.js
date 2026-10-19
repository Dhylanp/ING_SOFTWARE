import { describe, expect, test } from 'vitest'
import { formatearCita, formatearFecha, formatearFechaHora } from './fechas'

describe('formato de fechas', () => {
  test('formatearFecha cambia a día-mes-año sin tocar la zona horaria', () => {
    expect(formatearFecha('2026-10-06')).toBe('06-10-2026')
    expect(formatearFecha('2026-10-06T23:59:00')).toBe('06-10-2026')
    expect(formatearFecha(null)).toBe('')
  })

  test('formatearCita muestra fecha y hora de pared', () => {
    expect(formatearCita('2026-11-03T09:30')).toBe('03-11-2026 09:30')
  })

  test('formatearFechaHora convierte un instante UTC a hora local', () => {
    const iso = '2026-10-06T12:00:00Z'
    const d = new Date(iso)
    const esperado = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    expect(formatearFechaHora(iso)).toBe(esperado)
    expect(formatearFechaHora('basura')).toBe('basura')
    expect(formatearFechaHora(undefined)).toBe('')
  })
})
