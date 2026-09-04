// Forwards decoded notifications to Upstash QStash, which reliably delivers them (with its own
// retries) via HTTP POST back to this app's own public /event endpoint. Uses the global `fetch`
// available in Node 24 - no HTTP client dependency needed.

export async function publishToQstash(payload: unknown): Promise<void> {
  const publicUrl = process.env.EVENT_PUBLIC_URL;
  const token = process.env.QSTASH_TOKEN;

  const destinationUrl = `${publicUrl}/event`;
  const response = await fetch(`https://qstash.upstash.io/v2/publish/${encodeURIComponent(destinationUrl)}`, {
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
