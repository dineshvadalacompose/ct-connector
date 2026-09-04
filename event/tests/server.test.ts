import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';

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
  it('responds 204 for a valid Pub/Sub envelope wrapping a ResourceCreated notification', async () => {
    const envelope = buildEnvelope({
      notificationType: 'ResourceCreated',
      projectKey: 'test-project',
      resource: { typeId: 'product', id: 'test-product-id' },
      version: 1,
      modifiedAt: '2026-09-04T00:00:00.000Z',
    });

    const response = await request(app).post('/event').send(envelope);

    expect(response.status).toBe(204);
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
