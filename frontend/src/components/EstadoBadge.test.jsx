import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import EstadoBadge from './EstadoBadge'

describe('EstadoBadge', () => {
  test('muestra el nombre del estado a partir del id', () => {
    render(<EstadoBadge idEstado={3} />)
    expect(screen.getByText('Devuelta')).toBeInTheDocument()
  })

  test('usa el nombre que entrega la API cuando viene', () => {
    render(<EstadoBadge idEstado={2} nombre="Aceptada" />)
    expect(screen.getByText('Aceptada')).toBeInTheDocument()
  })

  test('cada estado tiene un color de fondo propio', () => {
    const { unmount } = render(<EstadoBadge idEstado={3} />)
    const devuelta = screen.getByTestId('estado-badge').style.backgroundColor
    unmount()
    render(<EstadoBadge idEstado={5} />)
    const agendada = screen.getByTestId('estado-badge').style.backgroundColor
    expect(devuelta).not.toBe(agendada)
  })
})
