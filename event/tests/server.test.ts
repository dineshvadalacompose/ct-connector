import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';

const ENV_KEYS = ['EVENT_PUBLIC_URL', 'QSTASH_TOKEN'];

function buildEnvelope(notification: unknown) {
  const data = Buffer.from(JSON.stringify(notification), 'utf-8').toString('base64');
  return {
    message: {
      data,
      messageId: 'test-message-id',
      publishTime: '2026-09-04T00:00:00.000Z',
    },
    subscription: 'projects/test-project/subscriptions/test-subscription',
  };
}

describe('POST /event', () => {
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

  it('responds 204 for a valid Pub/Sub envelope wrapping a ResourceCreated notification, and forwards it to QStash', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const notification = {
      notificationType: 'ResourceCreated',
      projectKey: 'test-project',
      resource: { typeId: 'product', id: 'test-product-id' },
      version: 1,
      modifiedAt: '2026-09-04T00:00:00.000Z',
    };
    const envelope = buildEnvelope(notification);

    const response = await request(app).post('/event').send(envelope);

    expect(response.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    const expectedDestination = encodeURIComponent('https://event-xxxx.example.gcp.sandbox.commercetools.app/event');
    expect(url).toBe(`https://qstash.upstash.io/v2/publish/${expectedDestination}`);
    expect(options).toMatchObject({
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-qstash-token',
        'Content-Type': 'application/json',
      },
    });
    expect(JSON.parse(options.body)).toEqual(notification);
  });

  it('responds 500 (not 204) when forwarding the decoded event to QStash fails, so Pub/Sub retries', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('server error', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    const envelope = buildEnvelope({
      notificationType: 'ResourceCreated',
      projectKey: 'test-project',
      resource: { typeId: 'product', id: 'test-product-id' },
      version: 1,
      modifiedAt: '2026-09-04T00:00:00.000Z',
    });

    const response = await request(app).post('/event').send(envelope);

    expect(response.status).toBe(500);
  });

  it('still responds 204 when message.data is not valid base64/JSON, instead of erroring', async () => {
    const response = await request(app)
      .post('/event')
      .send({ message: { data: 'not-valid-base64-json!!!' }, subscription: 'test' });

    expect(response.status).toBe(204);
  });

  it('still responds 204 when the envelope is missing message.data entirely', async () => {
    const response = await request(app).post('/event').send({ subscription: 'test' });

    expect(response.status).toBe(204);
  });
});
