# ct-connector service

A minimal commercetools Connect service that implements a Cart create API Extension. When a
shopping cart is created, this service checks each line item and rejects the cart if any single
item has a quantity greater than 20 units.

## Run it locally

```
npm install
npm run start:dev
```

The service listens on port 8080 by default (set `PORT` in a `.env` file to change it). Once
running, open `http://localhost:8080/` or `http://localhost:8080/service` in a browser to confirm
it's alive.

## Run the tests

```
npm test
```

## Connecting this to a real commercetools project

When commercetools Connect deploys this service for real (not local dev), the deployment gets
assigned its own public URL, which is shown on the deployment's Overview screen. commercetools
Connect does not automatically know this URL ahead of time, so it has to be entered once, by
hand, into the deployment's configuration under the key `SERVICE_PUBLIC_URL`. From then on, every
time this service is deployed or redeployed, it registers itself automatically - no manual step
needed - via the `connector:post-deploy` script, which runs after `postDeploy` in `connect.yaml`.

If this deployment is ever removed, `connector:pre-undeploy` automatically cleans up that same
registration first, so the real commercetools project is never left trying to call a URL that no
longer exists whenever someone creates a cart.

This is different from the `register-extension` script described below, which is only for testing
on your own machine with a temporary tunnel URL.

The `POST /service` endpoint requires every request to carry an `Authorization` header matching
the `EXTENSION_AUTH_SECRET` value in `.env` - this stops anyone else who finds the URL from
pretending to be commercetools. The health check routes (`GET /` and `GET /service`) don't require
it.

To let a real commercetools project reach this service while developing locally, you need to
expose it on a public URL and tell commercetools to call that URL:

1. Start the service:

   ```
   npm run start:dev
   ```

   It listens on port 8080 by default (set `PORT` in `.env` to change it).

2. In a second terminal, start a public tunnel to that port. This uses `localtunnel`, which needs
   no install or signup:

   ```
   npx localtunnel --port 8080
   ```

   It prints a public URL that looks like `https://xxxx.loca.lt`. Keep this terminal open - the
   tunnel stops working if you close it.

   Note: if you open that `loca.lt` URL in a browser yourself, localtunnel's free tier shows an
   interstitial "click to continue" page first. That's only a browser thing - it doesn't affect
   commercetools calling the URL directly (server-to-server calls go straight through).

3. Register (or update) the API Extension on your commercetools project so it points at that
   tunnel URL:

   ```
   npm run register-extension -- https://xxxx.loca.lt
   ```

   Replace the URL with the one localtunnel printed in step 2. This reads your commercetools
   credentials from `.env`, gets an access token, and creates (or updates) an Extension resource
   named `cart-validator-connector` that calls this service whenever a cart is created. It's safe
   to re-run any time the tunnel URL changes - it updates the existing Extension rather than
   creating a duplicate.

4. Create a cart in your commercetools project (for example via the Merchant Center or API) with
   a line item quantity over 20 units, and confirm it's rejected.
