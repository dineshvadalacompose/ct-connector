import express, { Request, Response } from 'express';
import { publishToQstash } from './qstashClient';

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
app.post('/event', async (req: Request, res: Response) => {
  try {
    // QStash forwards the bare notification JSON, not a Pub/Sub envelope, so when it lands back
    // here (this app forwards to its own address), `message.data` is undefined and decoding
    // throws - the always-204 decode-failure path below catches it without forwarding again.
    // This is what stops the round trip from looping forever; if the QStash payload shape ever
    // changes to look like a real envelope, this stops being true.
    const data = req.body?.message?.data;
    const decoded = Buffer.from(data, 'base64').toString('utf-8');
    const notification = JSON.parse(decoded);

    console.log('Product event received:', JSON.stringify(notification));

    try {
      await publishToQstash(notification);
    } catch (forwardError) {
      // Decode failure above is permanent (never fixed by retrying), so it still acks with 204.
      // A forwarding failure here is transient, so respond 500 to let Pub/Sub redeliver and retry.
      console.error('Failed to forward event to QStash:', forwardError);
      res.status(500).send();
      return;
    }
  } catch (error) {
    // An unparseable message will never become parseable on retry, so acknowledge it (204)
    // rather than returning an error status that would trigger endless redelivery.
    console.error('Failed to decode Pub/Sub push message:', error);
  }

  // 204 acknowledges the message so Pub/Sub doesn't redeliver it.
  res.status(204).send();
});
