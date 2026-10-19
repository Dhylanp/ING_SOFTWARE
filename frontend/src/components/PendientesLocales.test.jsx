import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test } from 'vitest'
import { guardarPendiente } from '../offline/almacen'
import { borrarAlmacenLocal } from '../test/utils'
import PendientesLocales from './PendientesLocales'

describe('PendientesLocales (HU19)', () => {
  beforeEach(() => borrarAlmacenLocal())

  test('sin registros locales no muestra nada', async () => {
    // Arrange / Act
    const { container } = render(<PendientesLocales />)

    // Assert
    await new Promise((r) => setTimeout(r, 20)) // deja terminar la lectura de IndexedDB
    expect(container).toBeEmptyDOMElement()
  })

  test('muestra cada registro guardado con su distintivo "Pendiente de sincronizar"', async () => {
    // Arrange
    await guardarPendiente({ payload: { idPersona: 1, fechaInicio: '2026-10-01' }, nombrePaciente: 'Ana Pérez' })

    // Act
    render(<PendientesLocales />)

    // Assert
    expect(await screen.findByText('Pendiente de sincronizar')).toBeInTheDocument()
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getAllByTestId('registro-local')).toHaveLength(1)
  })
})
