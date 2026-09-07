import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import EntryPoint from '../src/entry-point'

describe('EntryPoint', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows a loading indicator while the fetch is in flight', () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))
    render(<EntryPoint />)
    expect(screen.getByText(/loading events/i)).toBeTruthy()
  })

  it('shows the events once the fetch resolves', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [{ receivedAt: '2026-01-01T00:00:00.000Z', payload: { hello: 'world' } }],
      }),
    })
    render(<EntryPoint />)
    await waitFor(() => expect(screen.getByText(/received at 2026-01-01/i)).toBeTruthy())
    expect(screen.getByText(/"hello"/)).toBeTruthy()
  })

  it('shows an empty-state message when there are no events', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [] }),
    })
    render(<EntryPoint />)
    await waitFor(() => expect(screen.getByText(/no events received yet/i)).toBeTruthy())
  })

  it('shows an error message when the response is not ok', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 })
    render(<EntryPoint />)
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
  })

  it('shows an error message when the fetch itself fails', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network down'))
    render(<EntryPoint />)
    await waitFor(() => expect(screen.getByText(/network down/i)).toBeTruthy())
  })

  it('re-fetches when the Refresh button is clicked', async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ messages: [] }) })
    render(<EntryPoint />)
    await waitFor(() => expect(screen.getByText(/no events received yet/i)).toBeTruthy())

    screen.getByRole('button', { name: /refresh/i }).click()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })
})
