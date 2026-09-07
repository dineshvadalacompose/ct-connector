const entryPointUriPath = process.env.ENTRY_POINT_URI_PATH ?? 'event-relay-console'

const config = {
  name: 'Event Relay Console',
  entryPointUriPath,
  cloudIdentifier: '${env:CLOUD_IDENTIFIER}',
  env: {
    production: {
      applicationId: '${env:CUSTOM_APPLICATION_ID}',
      url: '${env:APPLICATION_URL}',
    },
    development: {
      initialProjectKey: process.env.CTP_PROJECT_KEY ?? 'placeholder-project-key',
    },
  },
  oAuthScopes: {
    view: ['view_project_settings'],
    manage: [],
  },
  // Merchant Center's own security policy only allows fetches to a fixed set of hosts by
  // default. This screen fetches the event log from a separate, unauthenticated, read-only
  // app (github.com/dineshvadalacompose/qstash-receiver) - without declaring it here, the
  // browser blocks the request outright (confirmed live: "Refused to connect... violates the
  // following Content Security Policy directive"). This ADDS to the platform's own default
  // allowlist (mc-api, this app's own URL, etc.) rather than replacing it - confirmed by
  // reading @commercetools-frontend/application-config's own merge logic directly.
  headers: {
    csp: {
      'connect-src': ['https://qstash-receiver-phi.vercel.app'],
    },
  },
  icon: '${path:@commercetools-frontend/assets/application-icons/rocket.svg}',
  mainMenuLink: {
    defaultLabel: 'Event Relay Console',
    labelAllLocales: [],
    permissions: [],
  },
  submenuLinks: [],
  permissionGroups: [],
}

export default config
