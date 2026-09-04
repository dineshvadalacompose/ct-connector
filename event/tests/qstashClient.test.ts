import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { publishToQstash } from '../src/qstashClient';

const ENV_KEYS = ['EVENT_PUBLIC_URL', 'QSTASH_TOKEN'];

describe('publishToQstash', () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
    }
    process.env.EVENT_PUBLIC_URL = 'https://event-xxxx.example.gcp.sandbox.commercetools.app';
    process.env.QSTASH_TOKEN = 'test-qstash-token';
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      process.env[key] = originalEnv[key];
    }
    vi.restoreAllMocks();
  });

  it('publishes the payload to QStash with the raw (unencoded) destination URL, headers, and body', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const payload = { notificationType: 'ResourceCreated', resource: { typeId: 'product', id: 'test-id' } };

    await expect(publishToQstash(payload)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];

    // Confirmed against a live QStash account: the destination URL is appended raw, not
    // percent-encoded (an encoded URL is rejected with "endpoint has invalid scheme").
    const expectedDestination = 'https://event-xxxx.example.gcp.sandbox.commercetools.app/event';
    expect(url).toBe(`https://qstash-us-east-1.upstash.io/v2/publish/${expectedDestination}`);
    expect(options).toMatchObject({
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-qstash-token',
        'Content-Type': 'application/json',
      },
    });
    expect(JSON.parse(options.body)).toEqual(payload);
  });

  it('throws a clear error including status and response body when QStash rejects the publish', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('unauthorized', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(publishToQstash({ foo: 'bar' })).rejects.toThrow(
      /Failed to publish to QStash: 401 unauthorized/,
    );
  });
});
