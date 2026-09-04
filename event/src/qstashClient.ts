// Forwards decoded notifications to Upstash QStash, which reliably delivers them (with its own
// retries) via HTTP POST back to this app's own public /event endpoint. Uses the global `fetch`
// available in Node 24 - no HTTP client dependency needed.
//
// QSTASH_BASE_URL: QStash's regions each have their own endpoint, and a token only works against
// its own account's home region (confirmed against a live account - the generic
// qstash.upstash.io host rejected this token with "user not found in this region", since it
// resolves to the EU region and this account's home region is us-east-1). Defaults to that
// confirmed-working host; override via env if a different account's region ever differs.
//
// The destination URL is appended RAW after /v2/publish/, not percent-encoded - also confirmed
// live: an encoded URL is rejected ("endpoint has invalid scheme"), since QStash expects the
// remainder of the path to be the literal destination URL.

export async function publishToQstash(payload: unknown): Promise<void> {
  const publicUrl = process.env.EVENT_PUBLIC_URL;
  const token = process.env.QSTASH_TOKEN;
  const baseUrl = process.env.QSTASH_BASE_URL || 'https://qstash-us-east-1.upstash.io';

  const destinationUrl = `${publicUrl}/event`;
  const response = await fetch(`${baseUrl}/v2/publish/${destinationUrl}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to publish to QStash: ${response.status} ${body}`);
  }
}
