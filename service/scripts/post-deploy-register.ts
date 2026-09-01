// Runs automatically as part of commercetools Connect's own deploy pipeline (see connect.yaml's
// `postDeploy` script). Unlike register-extension.ts (the local/manual tunnel-testing script),
// this reads its inputs from the environment variables Connect injects at deploy time, not from
// CLI arguments - there's no interactive terminal during an automated deploy.

import { registerExtension } from '../src/commercetoolsClient';

async function main() {
  const publicUrl = process.env.SERVICE_PUBLIC_URL;
  const authSecret = process.env.EXTENSION_AUTH_SECRET;

  if (!publicUrl || !authSecret) {
    console.error(
      'post-deploy-register: missing required environment variable(s):',
      [!publicUrl && 'SERVICE_PUBLIC_URL', !authSecret && 'EXTENSION_AUTH_SECRET']
        .filter(Boolean)
        .join(', '),
    );
    console.error(
      'Set these in the deployment configuration (SERVICE_PUBLIC_URL is shown on the ' +
        "deployment's Overview screen after the first deploy) and redeploy.",
    );
    process.exit(1);
    return;
  }

  await registerExtension(publicUrl, authSecret);
}

main()
  .then(() => {
    console.log('post-deploy-register: API Extension registration succeeded');
  })
  .catch((error) => {
    console.error('post-deploy-register: API Extension registration failed:', error);
    process.exit(1);
  });
