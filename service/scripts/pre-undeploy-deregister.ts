// Runs automatically as part of commercetools Connect's own deploy pipeline (see connect.yaml's
// `preUndeploy` script). Deregisters the Cart Create API Extension this service registered in
// post-deploy-register.ts, so that removing this deployment doesn't leave the real commercetools
// project permanently hooking every cart creation through a now-dead URL.

import { deregisterExtension } from '../src/commercetoolsClient';

async function main() {
  const required = ['CTP_PROJECT_KEY', 'CTP_CLIENT_ID', 'CTP_CLIENT_SECRET', 'CTP_AUTH_URL', 'CTP_API_URL', 'CTP_SCOPES'];
  const missing = required.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    console.error('pre-undeploy-deregister: missing required environment variable(s):', missing.join(', '));
    console.error('Set these in the deployment configuration and redeploy.');
    process.exit(1);
    return;
  }

  await deregisterExtension();
}

main()
  .then(() => {
    console.log('pre-undeploy-deregister: API Extension deregistration succeeded');
  })
  .catch((error) => {
    console.error('pre-undeploy-deregister: API Extension deregistration failed:', error);
    process.exit(1);
  });
