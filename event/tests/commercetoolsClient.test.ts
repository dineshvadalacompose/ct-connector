import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerSubscription, deregisterSubscription } from '../src/commercetoolsClient';

const ENV_KEYS = ['CTP_API_URL', 'CTP_PROJECT_KEY', 'CTP_AUTH_URL', 'CTP_CLIENT_ID', 'CTP_CLIENT_SECRET', 'CTP_SCOPES'];

function mockTokenResponse() {
  return new Response(JSON.stringify({ access_token: 'test-token' }), { status: 200 });
}

describe('registerSubscription / deregisterSubscription', () => {
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
    process.env.CTP_SCOPES = 'manage_subscriptions:test-project';
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      process.env[key] = originalEnv[key];
    }
    vi.restoreAllMocks();
  });

  it('creates the subscription when a 404 on GET indicates it does not exist yet', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockTokenResponse())
      .mockResolvedValueOnce(new Response('not found', { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(registerSubscription('test-topic', 'test-gcp-project')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const createCall = fetchMock.mock.calls[2];
    expect(createCall[0]).toContain('/test-project/subscriptions');
    const body = JSON.parse(createCall[1].body);
    expect(body).toMatchObject({
      key: 'product-event-logger',
      destination: { type: 'GoogleCloudPubSub', topic: 'test-topic', projectId: 'test-gcp-project' },
      format: { type: 'Platform' },
      changes: [{ resourceTypeId: 'product' }],
    });
  });

  it('does nothing when the subscription already exists', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockTokenResponse())
      .mockResolvedValueOnce(new Response(JSON.stringify({ version: 1 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(registerSubscription('test-topic', 'test-gcp-project')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws a clear error when create fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockTokenResponse())
      .mockResolvedValueOnce(new Response('not found', { status: 404 }))
      .mockResolvedValueOnce(new Response('server error', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(registerSubscription('test-topic', 'test-gcp-project')).rejects.toThrow(
      /Failed to create subscription: 500/,
    );
  });

  it('treats a 404 on GET as already-absent success when deregistering (no DELETE attempted)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockTokenResponse())
      .mockResolvedValueOnce(new Response('not found', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(deregisterSubscription()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('deletes the subscription using the fetched version when it exists', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockTokenResponse())
      .mockResolvedValueOnce(new Response(JSON.stringify({ version: 2 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(deregisterSubscription()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const deleteCall = fetchMock.mock.calls[2];
    expect(deleteCall[0]).toContain('version=2');
    expect(deleteCall[1]).toMatchObject({ method: 'DELETE' });
  });

  it('treats a 404 on DELETE (race condition) as success', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockTokenResponse())
      .mockResolvedValueOnce(new Response(JSON.stringify({ version: 2 }), { status: 200 }))
      .mockResolvedValueOnce(new Response('not found', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(deregisterSubscription()).resolves.toBeUndefined();
  });
});
