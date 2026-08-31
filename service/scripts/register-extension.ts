// One-off CLI script: registers (or updates) the Cart Create API Extension on the configured
// commercetools project so it points at a running instance of this service.
//
// Usage: npm run register-extension -- <public-url>
// Env vars are loaded via `node --env-file=.env` (see the npm script), not by this file.

import { registerExtension } from '../src/commercetoolsClient';

async function main() {
  const publicUrl = process.argv[2];

  if (!publicUrl) {
    console.error('Usage: npm run register-extension -- <public-url>');
    console.error('Example: npm run register-extension -- https://xxxx.loca.lt');
    process.exit(1);
  }

  const authSecret = process.env.EXTENSION_AUTH_SECRET;
  if (!authSecret) {
    console.error('EXTENSION_AUTH_SECRET is not set. Add it to your .env file first.');
    process.exit(1);
  }

  await registerExtension(publicUrl, authSecret);
}

main().catch((error) => {
  console.error('Failed to register extension:', error);
  process.exit(1);
});
