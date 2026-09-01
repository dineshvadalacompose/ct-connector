// Talks to the commercetools platform API: gets an OAuth token via the client-credentials flow,
// and idempotently registers (or updates) the Cart Create API Extension that points at this
// service. Uses the global `fetch` available in Node 24 - no HTTP client dependency needed.

const EXTENSION_KEY = 'cart-validator-connector';

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

export async function registerExtension(publicUrl: string, authSecret: string): Promise<void> {
  const apiUrl = requireEnv('CTP_API_URL');
  const projectKey = requireEnv('CTP_PROJECT_KEY');

  const token = await getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const destination = {
    type: 'HTTP',
    url: `${publicUrl}/service`,
    authentication: {
      type: 'AuthorizationHeader',
      headerValue: authSecret,
    },
  };

  const extensionUrl = `${apiUrl}/${projectKey}/extensions/key=${EXTENSION_KEY}`;
  const getResponse = await fetch(extensionUrl, { method: 'GET', headers });

  if (getResponse.status === 404) {
    const createResponse = await fetch(`${apiUrl}/${projectKey}/extensions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        key: EXTENSION_KEY,
        destination,
        triggers: [{ resourceTypeId: 'cart', actions: ['Create'] }],
      }),
    });

    if (!createResponse.ok) {
      const body = await createResponse.text();
      throw new Error(`Failed to create extension: ${createResponse.status} ${body}`);
    }

    console.log('Extension created');
    return;
  }

  if (!getResponse.ok) {
    const body = await getResponse.text();
    throw new Error(`Failed to fetch existing extension: ${getResponse.status} ${body}`);
  }

  const existing = (await getResponse.json()) as { version: number };

  const updateResponse = await fetch(extensionUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      version: existing.version,
      actions: [{ action: 'changeDestination', destination }],
    }),
  });

  if (!updateResponse.ok) {
    const body = await updateResponse.text();
    throw new Error(`Failed to update extension: ${updateResponse.status} ${body}`);
  }

  console.log('Extension updated');
}

export async function deregisterExtension(): Promise<void> {
  const apiUrl = requireEnv('CTP_API_URL');
  const projectKey = requireEnv('CTP_PROJECT_KEY');

  const token = await getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const extensionUrl = `${apiUrl}/${projectKey}/extensions/key=${EXTENSION_KEY}`;
  const getResponse = await fetch(extensionUrl, { method: 'GET', headers });

  if (getResponse.status === 404) {
    console.log('Extension already absent, nothing to do');
    return;
  }

  if (!getResponse.ok) {
    const body = await getResponse.text();
    throw new Error(`Failed to fetch existing extension: ${getResponse.status} ${body}`);
  }

  const existing = (await getResponse.json()) as { version: number };

  const deleteResponse = await fetch(`${extensionUrl}?version=${existing.version}`, {
    method: 'DELETE',
    headers,
  });

  if (deleteResponse.status === 404) {
    console.log('Extension already absent, nothing to do');
    return;
  }

  if (!deleteResponse.ok) {
    const body = await deleteResponse.text();
    throw new Error(`Failed to delete extension: ${deleteResponse.status} ${body}`);
  }

  console.log('Extension deleted');
}
