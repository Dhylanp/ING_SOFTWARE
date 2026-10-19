import '@testing-library/jest-dom/vitest'
// IndexedDB simulado para probar el modo offline dentro de jsdom
import 'fake-indexeddb/auto'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// con globals: false Testing Library no desmonta solo entre pruebas
afterEach(cleanup)
