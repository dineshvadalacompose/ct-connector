import { createRoot } from 'react-dom/client'
import { ApplicationShell } from '@commercetools-frontend/application-shell'
import type { ApplicationWindow } from '@commercetools-frontend/constants'
import EntryPoint from './entry-point'

declare let window: ApplicationWindow

// This is intentionally a minimal placeholder application: it only proves
// that this deployment type (a Merchant Center Custom Application) works.
// No real data or API calls are made here.
const loadMessages = async () => ({})

const container = document.getElementById('app')
const root = createRoot(container as HTMLElement)

root.render(
  <ApplicationShell environment={window.app} applicationMessages={loadMessages}>
    <EntryPoint />
  </ApplicationShell>
)
