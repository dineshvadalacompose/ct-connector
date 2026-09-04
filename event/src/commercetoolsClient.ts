// Talks to the commercetools platform API: gets an OAuth token via the client-credentials flow,
// and idempotently registers (or leaves alone) the Changes Subscription that delivers Product
// create/update notifications to this app's Pub/Sub topic. Uses the global `fetch` available in
// Node 24 - no HTTP client dependency needed.

const SUBSCRIPTION_KEY = 'product-event-logger';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function getAccessToken(): Promise<string> {
  const authUrl = requireEnv('CTP_AUTH_URL');
  const clientId = requireEnv('CTP_CLIENT_ID');
  const clientSecret = requireEnv('CTP_CLIENT_SECRET');
  const scopes = requireEnv('CTP_SCOPES');

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${authUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: `grant_type=client_credentials&scope=${encodeURIComponent(scopes)}`,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to get commercetools access token: ${response.status} ${body}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export async function registerSubscription(topic: string, projectId: string): Promise<void> {
  const apiUrl = requireEnv('CTP_API_URL');
  const projectKey = requireEnv('CTP_PROJECT_KEY');

  const token = await getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const subscriptionUrl = `${apiUrl}/${projectKey}/subscriptions/key=${SUBSCRIPTION_KEY}`;
  const getResponse = await fetch(subscriptionUrl, { method: 'GET', headers });

  if (getResponse.status === 404) {
    const createResponse = await fetch(`${apiUrl}/${projectKey}/subscriptions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        key: SUBSCRIPTION_KEY,
        destination: {
          type: 'GoogleCloudPubSub',
          topic,
          projectId,
        },
        format: { type: 'Platform' },
        changes: [{ resourceTypeId: 'product' }],
      }),
    });

    if (!createResponse.ok) {
      const body = await createResponse.text();
      throw new Error(`Failed to create subscription: ${createResponse.status} ${body}`);
    }

    console.log('Subscription created');
    return;
  }

  if (!getResponse.ok) {
    const body = await getResponse.text();
    throw new Error(`Failed to fetch existing subscription: ${getResponse.status} ${body}`);
  }

  // Already exists - this app always deploys to the same queue for a given deployment, so there's
  // no need to diff or update the destination the way a production system might.
  console.log('Subscription already registered');
}

export async function deregisterSubscription(): Promise<void> {
  const apiUrl = requireEnv('CTP_API_URL');
  const projectKey = requireEnv('CTP_PROJECT_KEY');

  const token = await getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const subscriptionUrl = `${apiUrl}/${projectKey}/subscriptions/key=${SUBSCRIPTION_KEY}`;
  const getResponse = await fetch(subscriptionUrl, { method: 'GET', headers });

  if (getResponse.status === 404) {
    console.log('Subscription already absent, nothing to do');
    return;
  }

  if (!getResponse.ok) {
    const body = await getResponse.text();
    throw new Error(`Failed to fetch existing subscription: ${getResponse.status} ${body}`);
  }

  const existing = (await getResponse.json()) as { version: number };

  const deleteResponse = await fetch(`${subscriptionUrl}?version=${existing.version}`, {
    method: 'DELETE',
    headers,
  });

  if (deleteResponse.status === 404) {
    console.log('Subscription already absent, nothing to do');
    return;
  }

  if (!deleteResponse.ok) {
    const body = await deleteResponse.text();
    throw new Error(`Failed to delete subscription: ${deleteResponse.status} ${body}`);
  }

  console.log('Subscription deleted');
}
