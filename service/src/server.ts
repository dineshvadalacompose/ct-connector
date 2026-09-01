import express, { Request, Response } from 'express';
import { validateCart } from './validators/cartValidator';

export const app = express();

app.use(express.json());

// Health check - used by commercetools Connect and local devs to confirm the service is alive.
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Convenience health check at the same path as the Extension endpoint, for manual sanity-checking
// in a browser. Not part of the real API Extension contract.
app.get('/service', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// The actual API Extension endpoint that commercetools calls for a Cart Create action.
app.post('/service', (req: Request, res: Response) => {
  // commercetools sends this shared secret back verbatim as the Authorization header on every
  // call, so we can confirm the request really came from our registered Extension. Fail closed:
  // if the secret isn't configured at all, treat every request as unauthorized rather than
  // silently skipping the check.
  const expectedAuth = process.env.EXTENSION_AUTH_SECRET;
  const actualAuth = req.headers['authorization'];

  if (!expectedAuth || actualAuth !== expectedAuth) {
    return res.status(401).json({
      errors: [{ code: 'Unauthorized', message: 'Missing or invalid Authorization header.' }],
    });
  }

  try {
    const { resource } = req.body ?? {};

    // For Create actions the resource representation is the draft, so lineItems may be
    // directly on resource.obj or on resource itself depending on resource type.
    const lineItems = resource?.obj?.lineItems ?? resource?.lineItems ?? [];
    const customLineItems = resource?.obj?.customLineItems ?? resource?.customLineItems ?? [];

    const result = validateCart(lineItems, customLineItems);

    if (!result.valid) {
      return res.status(400).json({
        errors: [
          {
            code: 'InvalidInput',
            message: result.reason,
            localizedMessage: { en: result.reason },
          },
        ],
      });
    }

    return res.status(200).json({ actions: [] });
  } catch (error) {
    // API Extensions treat a non-2xx response as a signal to fail the original commerce
    // operation, so failing closed here on an unexpected error is correct.
    console.error('Unexpected error while processing Cart create extension:', error);
    return res.status(500).json({
      errors: [{ code: 'General', message: 'Internal error' }],
    });
  }
});
