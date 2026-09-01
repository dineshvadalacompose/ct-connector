import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deregisterExtension } from '../src/commercetoolsClient';

const ENV_KEYS = ['CTP_API_URL', 'CTP_PROJECT_KEY', 'CTP_AUTH_URL', 'CTP_CLIENT_ID', 'CTP_CLIENT_SECRET', 'CTP_SCOPES'];

function mockTokenResponse() {
  return new Response(JSON.stringify({ access_token: 'test-token' }), { status: 200 });
}

describe('deregisterExtension', () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
    }
    process.env.CTP_API_URL = 'https://api.example.com';
    process.env.CTP_PROJECT_KEY = 'test-project';
    process.env.CTP_AUTH_URL = 'https://auth.example.com';
    process.env.CTP_CLIENT_ID = 'test-client-id';
    process.env.CTP_CLIENT_SECRET = 'test-client-secret';
    process.env.CTP_SCOPES = 'manage_extensions:test-project';
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      process.env[key] = originalEnv[key];
    }
    vi.restoreAllMocks();
  });

  it('treats a 404 on GET as already-absent success (no DELETE attempted)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockTokenResponse())
      .mockResolvedValueOnce(new Response('not found', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(deregisterExtension()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('deletes the extension using the fetched version when GET succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockTokenResponse())
      .mockResolvedValueOnce(new Response(JSON.stringify({ version: 3 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(deregisterExtension()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const deleteCall = fetchMock.mock.calls[2];
    expect(deleteCall[0]).toContain('version=3');
    expect(deleteCall[1]).toMatchObject({ method: 'DELETE' });
  });

  it('treats a 404 on DELETE (race condition) as success', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockTokenResponse())
      .mockResolvedValueOnce(new Response(JSON.stringify({ version: 3 }), { status: 200 }))
      .mockResolvedValueOnce(new Response('not found', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(deregisterExtension()).resolves.toBeUndefined();
  });

  it('throws a clear error when DELETE fails for a non-404 reason', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockTokenResponse())
      .mockResolvedValueOnce(new Response(JSON.stringify({ version: 3 }), { status: 200 }))
      .mockResolvedValueOnce(new Response('server error', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(deregisterExtension()).rejects.toThrow(/Failed to delete extension: 500/);
  });
});
