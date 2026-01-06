import { describe, it, expect } from 'vitest'
import api from './api'

describe('API Client', () => {
  it('should be configured with baseURL from environment', () => {
    expect(api.defaults.baseURL).toBe(import.meta.env.VITE_API_URL)
  })

  it('should have axios instance with correct defaults', () => {
    expect(api.defaults.headers.common['Content-Type']).toBe('application/json')
  })

  it('should have timeout configured', () => {
    expect(api.defaults.timeout).toBeDefined()
  })
})
