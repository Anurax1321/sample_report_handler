import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'
import api from './lib/api'

// Mock the API module
vi.mock('./lib/api')

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the main title', () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

    render(<App />)
    expect(screen.getByText('Sample Report Handler')).toBeInTheDocument()
  })

  it('displays loading state initially', () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}))

    render(<App />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays success message when backend is healthy', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { status: 'healthy' }
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/backend is healthy/i)).toBeInTheDocument()
    })
  })

  it('displays error message when backend is unreachable', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/error.*backend/i)).toBeInTheDocument()
    })
  })

  it('calls the health endpoint on mount', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { status: 'healthy' }
    })

    render(<App />)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/health')
    })
  })
})
