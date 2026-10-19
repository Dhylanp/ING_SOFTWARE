import { screen, waitFor } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import AlertaContador from './AlertaContador'
import { errorDeRed, mockApi, renderPagina } from '../test/utils'

describe('AlertaContador (HU16)', () => {
  test('muestra la cantidad de alertas nuevas', async () => {
    mockApi({ 'GET /alertas/devoluciones': { pendientes: 4, sinRevisar: 2, items: [] } })
    renderPagina(<AlertaContador />)
    expect(await screen.findByTestId('contador-alertas')).toHaveTextContent('2')
  })

  test('si no hay nuevas muestra el total pendiente', async () => {
    mockApi({ 'GET /alertas/devoluciones': { pendientes: 3, sinRevisar: 0, items: [] } })
    renderPagina(<AlertaContador />)
    expect(await screen.findByTestId('contador-alertas')).toHaveTextContent('3')
  })

  test('sin conexión el enlace sigue disponible, sin contador', async () => {
    const { get } = mockApi({ 'GET /alertas/devoluciones': errorDeRed() })
    renderPagina(<AlertaContador />)
    await waitFor(() => expect(get).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: /Centro de alertas/ })).toBeInTheDocument()
    expect(screen.queryByTestId('contador-alertas')).toBeNull()
  })
})
