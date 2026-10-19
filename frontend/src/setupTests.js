import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// con globals: false Testing Library no desmonta solo entre pruebas
afterEach(cleanup)
