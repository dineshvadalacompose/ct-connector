import { describe, expect, it } from 'vitest'
import config from '../custom-application-config.mjs'

describe('custom-application-config', () => {
  it('registers the entry point path and matching Merchant Center scopes', () => {
    expect(config.entryPointUriPath).toBe('event-relay-console')
    expect(config.oAuthScopes).toEqual({
      view: ['view_project_settings'],
      manage: [],
    })
  })

  it('keeps the Connect-injected placeholders literal (never given a fallback)', () => {
    expect(config.cloudIdentifier).toBe('${env:CLOUD_IDENTIFIER}')
    expect(config.env.production.applicationId).toBe('${env:CUSTOM_APPLICATION_ID}')
    expect(config.env.production.url).toBe('${env:APPLICATION_URL}')
  })
})
