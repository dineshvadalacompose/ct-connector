import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';

const TEST_SECRET = 'test-shared-secret';

describe('POST /service authorization', () => {
  let originalSecret: string | undefined;

  beforeEach(() => {
    originalSecret = process.env.EXTENSION_AUTH_SECRET;
    process.env.EXTENSION_AUTH_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    process.env.EXTENSION_AUTH_SECRET = originalSecret;
  });

  it('rejects requests without a matching Authorization header', async () => {
    const response = await request(app)
      .post('/service')
      .send({ resource: { obj: { lineItems: [{ quantity: 5 }] } } });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      errors: [{ code: 'Unauthorized', message: 'Missing or invalid Authorization header.' }],
    });
  });

  it('accepts a valid cart when the Authorization header matches the shared secret', async () => {
    const response = await request(app)
      .post('/service')
      .set('Authorization', TEST_SECRET)
      .send({ resource: { obj: { lineItems: [{ quantity: 5 }] } } });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ actions: [] });
  });
});
