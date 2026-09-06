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
