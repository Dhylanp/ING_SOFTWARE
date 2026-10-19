import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import LineaTiempo from './LineaTiempo'

const eventos = [
  { idHistorial: 1, fecha: '2026-10-06T12:00:00Z', estadoAnterior: null, idEstadoNuevo: 1, estadoNuevo: 'Registrada', usuario: 'Admin CESFAM', comentario: 'Interconsulta registrada' },
  { idHistorial: 2, fecha: '2026-10-07T12:00:00Z', estadoAnterior: 'Registrada', idEstadoAnterior: 1, idEstadoNuevo: 3, estadoNuevo: 'Devuelta', usuario: 'Dra. Especialista', comentario: 'Devuelta: falta examen' },
]

describe('LineaTiempo (HU07)', () => {
  test('muestra un hito por cambio, en el orden recibido', () => {
    render(<LineaTiempo eventos={eventos} />)
    const hitos = screen.getAllByTestId('evento-historial')
    expect(hitos).toHaveLength(2)
    expect(within(hitos[0]).getByText('Registrada')).toBeInTheDocument()
    expect(within(hitos[1]).getByText('Devuelta')).toBeInTheDocument()
  })

  test('cada hito detalla estado anterior, estado nuevo y responsable', () => {
    render(<LineaTiempo eventos={eventos} />)
    const segundo = screen.getAllByTestId('evento-historial')[1]
    expect(within(segundo).getByText('Registrada')).toBeInTheDocument()
    expect(within(segundo).getByText('Devuelta')).toBeInTheDocument()
    expect(within(segundo).getByText('Responsable: Dra. Especialista')).toBeInTheDocument()
    expect(within(segundo).getByText('Devuelta: falta examen')).toBeInTheDocument()
  })

  test('el primer hito indica que es el inicio', () => {
    render(<LineaTiempo eventos={eventos} />)
    expect(within(screen.getAllByTestId('evento-historial')[0]).getByText(/Inicio/)).toBeInTheDocument()
  })

  test('sin eventos avisa que no hay historial', () => {
    render(<LineaTiempo eventos={[]} />)
    expect(screen.getByText('Esta interconsulta aún no tiene historial.')).toBeInTheDocument()
  })

  test('muestra cargando y errores', () => {
    const { rerender } = render(<LineaTiempo cargando />)
    expect(screen.getByText('Cargando historial...')).toBeInTheDocument()
    rerender(<LineaTiempo error="No se pudo cargar el historial." />)
    expect(screen.getByText('No se pudo cargar el historial.')).toBeInTheDocument()
  })
})
