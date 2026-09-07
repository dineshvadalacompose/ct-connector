import { useCallback, useEffect, useState } from 'react'
import PrimaryButton from '@commercetools-uikit/primary-button'

// Hardcoded on purpose: this app is a static client-side bundle built by
// @commercetools-frontend/mc-scripts. Its custom-application-config.mjs only
// substitutes a fixed set of commercetools-defined placeholders
// (CLOUD_IDENTIFIER, CUSTOM_APPLICATION_ID, APPLICATION_URL) into env.production/
// env.development - both objects reject any other key (additionalProperties:
// false), so there is no way to inject an arbitrary custom URL through
// connect.yaml/build config the way the event/service apps can. The endpoint
// itself is public, unauthenticated, and read-only, so hardcoding it here (and
// moving it with a one-line change if it ever relocates) is an acceptable
// tradeoff for this small project.
const EVENTS_API_URL = 'https://qstash-receiver-phi.vercel.app/api/messages'

type ReceivedMessage = {
  receivedAt: string
  payload: unknown
}

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; messages: ReceivedMessage[] }

const isReceivedMessage = (value: unknown): value is ReceivedMessage =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { receivedAt?: unknown }).receivedAt === 'string'

const EntryPoint = () => {
  const [state, setState] = useState<FetchState>({ status: 'loading' })

  const loadMessages = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const response = await fetch(EVENTS_API_URL)
      if (!response.ok) {
        setState({
          status: 'error',
          message: `The event feed responded with an error (status ${response.status}).`,
        })
        return
      }
      const data: unknown = await response.json()
      const messages =
        data && typeof data === 'object' && Array.isArray((data as { messages?: unknown }).messages)
          ? (data as { messages: unknown[] }).messages.filter(isReceivedMessage)
          : []
      setState({ status: 'ok', messages })
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof Error
            ? `Couldn't reach the event feed: ${error.message}`
            : "Couldn't reach the event feed.",
      })
    }
  }, [])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Event Relay Console</h1>
      <p>This lists the most recent events received by the relay, newest first (up to 50).</p>

      <div style={{ margin: '1rem 0' }}>
        <PrimaryButton label="Refresh" onClick={loadMessages} isDisabled={state.status === 'loading'} />
      </div>

      {state.status === 'loading' && <p>Loading events…</p>}

      {state.status === 'error' && (
        <p role="alert" style={{ color: '#7a1f1f', background: '#fdecea', padding: '0.75rem', borderRadius: 4 }}>
          {state.message}
        </p>
      )}

      {state.status === 'ok' && state.messages.length === 0 && <p>No events received yet.</p>}

      {state.status === 'ok' && state.messages.length > 0 && (
        <ol style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {state.messages.map((message, index) => (
            <li
              key={`${message.receivedAt}-${index}`}
              style={{ border: '1px solid #ccc', borderRadius: 4, padding: '0.75rem' }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>Received at {message.receivedAt}</p>
              <pre style={{ marginTop: '0.5rem', background: '#f5f5f5', padding: '0.75rem', overflowX: 'auto' }}>
                {JSON.stringify(message.payload, null, 2)}
              </pre>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default EntryPoint
