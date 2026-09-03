# ct-connector

A minimal commercetools Connect **Service** application, built as a learning/demo
project. It implements a Cart-create API Extension: whenever a cart is created,
the service checks each line item and rejects the cart if any single item has a
quantity greater than 20 units.

## Repository layout

- `connect.yaml` - the commercetools Connect deployment manifest at the repo
  root. It declares this repo's single deployable component (`service`), the
  configuration values it needs (project key, auth/API URLs, scopes, client
  credentials, and a shared extension secret), and its deploy/undeploy hooks.
- `service/` - the actual application code (an Express service written in
  TypeScript), its tests, and the script used to register the API Extension
  with a commercetools project.

See [`service/README.md`](service/README.md) for the full walkthrough: running
the service, running its tests, and connecting it to a real commercetools
project (including the local tunnel and extension-registration steps).

## Requirements

- Node.js version 24 (see `.nvmrc`).

## Quick start

From inside the `service/` directory:

```
npm install
npm run start:dev
```

This starts the service locally. In a separate terminal, `npm test` runs its
test suite. For the complete
setup - including exposing the service on a public URL and registering it as
an API Extension against a real commercetools project - see
[`service/README.md`](service/README.md).

## What's not done yet

- The only protection on the extension endpoint is a shared-secret check: every
  request to `POST /service` must carry an `Authorization` header matching the
  `EXTENSION_AUTH_SECRET` value, which stops random callers but is not a full
  authentication system.
- The connector and its deployment were both created without a human-readable
  "key" (only an internal id), so `.github/workflows/deploy-connector.yml`
  targets them by id. Fine as-is, but worth giving both a real key if this
  project is ever recreated from scratch.

## Continuous integration

Every push and pull request runs a GitHub Actions workflow
(`.github/workflows/ci.yml`) that installs dependencies, builds, and runs the
test suite for the service.

## How to release

This project is deployed through commercetools Connect's own hosting - no
local tunnel needed for real use. Shipping a change is a normal commit/push,
plus one extra step to actually make it go live:

1. Make your changes, commit, and push to `main` as usual. This alone does
   **not** touch the live service - pushing to `main` only runs the CI checks
   above.
2. Decide a version number for the release: bump the last number for a small
   fix (`v1.2.2` -> `v1.2.3`), the middle number for a new feature (`v1.2.3`
   -> `v1.3.0`).
3. Create and push a version tag - this is the step that actually ships it:
   ```
   git tag -a v1.2.3 -m "short description of what changed"
   git push origin v1.2.3
   ```
4. Pushing a tag matching `v*` triggers
   `.github/workflows/deploy-connector.yml`, which publishes that tagged code
   to the connector and redeploys the running instance with
   `--updateConnector` so it actually picks up the new version. Watch its
   progress under the repo's **Actions** tab.
5. Once it's green, the live service is running the new code. Worth
   double-checking with a real request if the change is significant.
