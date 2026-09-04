// Runs automatically as part of commercetools Connect's own deploy pipeline (see connect.yaml's
// `postDeploy` script). CONNECT_GCP_TOPIC_NAME and CONNECT_GCP_PROJECT_ID are injected by
// commercetools Connect itself at deploy time (this project deploys to a GCP region) - they are
// not operator-configured, so they don't appear in connect.yaml's configuration section.

import { registerSubscription } from '../src/commercetoolsClient';

async function main() {
  const required = [
    'CTP_PROJECT_KEY',
    'CTP_CLIENT_ID',
    'CTP_CLIENT_SECRET',
    'CTP_AUTH_URL',
    'CTP_API_URL',
    'CTP_SCOPES',
    'CONNECT_GCP_TOPIC_NAME',
    'CONNECT_GCP_PROJECT_ID',
  ];
  const missing = required.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    console.error('post-deploy-register: missing required environment variable(s):', missing.join(', '));
    console.error('Set these in the deployment configuration and redeploy.');
    process.exit(1);
    return;
  }

  const topic = process.env.CONNECT_GCP_TOPIC_NAME as string;
  const projectId = process.env.CONNECT_GCP_PROJECT_ID as string;

  await registerSubscription(topic, projectId);
}

main()
  .then(() => {
    console.log('post-deploy-register: Subscription registration succeeded');
  })
  .catch((error) => {
    console.error('post-deploy-register: Subscription registration failed:', error);
    process.exit(1);
  });
