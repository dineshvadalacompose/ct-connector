import express, { Request, Response } from 'express';

export const app = express();

app.use(express.json());

// Health check - used by commercetools Connect and local devs to confirm the app is alive.
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Convenience health check at the same path as the Subscription push endpoint, for manual
// sanity-checking in a browser. Not part of the real Pub/Sub push contract.
app.get('/event', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// The Subscription push endpoint. commercetools delivers messages here wrapped in a Google Cloud
// Pub/Sub push-subscription envelope: { message: { data: <base64>, ... }, subscription: ... }.
app.post('/event', (req: Request, res: Response) => {
  try {
    const data = req.body?.message?.data;
    const decoded = Buffer.from(data, 'base64').toString('utf-8');
    const notification = JSON.parse(decoded);

    console.log('Product event received:', JSON.stringify(notification));
  } catch (error) {
    // An unparseable message will never become parseable on retry, so acknowledge it (204)
    // rather than returning an error status that would trigger endless redelivery.
    console.error('Failed to decode Pub/Sub push message:', error);
  }

  // 204 acknowledges the message so Pub/Sub doesn't redeliver it.
  res.status(204).send();
});
