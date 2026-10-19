import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test } from 'vitest'
import { guardarPendiente } from '../offline/almacen'
import { borrarAlmacenLocal, mockApi } from '../test/utils'
import PendientesLocales from './PendientesLocales'

describe('PendientesLocales (HU19 / HU21)', () => {
  beforeEach(() => borrarAlmacenLocal())

  test('sin registros locales no muestra nada', async () => {
    // Arrange / Act
    const { container } = render(<PendientesLocales />)

    // Assert
    await new Promise((r) => setTimeout(r, 20)) // deja terminar la lectura de IndexedDB
    expect(container).toBeEmptyDOMElement()
  })

  test('muestra el distintivo pendiente y al sincronizar pasa a "Sincronizado"', async () => {
    // Arrange
    const user = userEvent.setup()
    await guardarPendiente({ payload: { idPersona: 1, fechaInicio: '2026-10-01' }, nombrePaciente: 'Ana Pérez' })
    mockApi({
      'POST /sincronizar': (cuerpo) => ({
        sincronizados: 1,
        fallidos: 0,
        resultados: cuerpo.registros.map((p) => ({ uuidLocal: p.uuidLocal, estado: 'sincronizado', idFormulario: 12 })),
      }),
    })
    render(<PendientesLocales />)
    expect(await screen.findByText('Pendiente de sincronizar')).toBeInTheDocument()

    // Act
    await user.click(screen.getByRole('button', { name: 'Sincronizar ahora' }))

    // Assert
    expect(await screen.findByText('Sincronizado')).toBeInTheDocument()
    expect(screen.getByText(/Interconsulta #12/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quitar sincronizados' })).toBeInTheDocument()
  })
})
