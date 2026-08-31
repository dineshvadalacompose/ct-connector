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
- This project has not been deployed through commercetools Connect's own
  hosting. Today, connecting it to a real commercetools project means running
  it locally and exposing it with a temporary public tunnel, not a production
  deployment.

## Continuous integration

Every push and pull request runs a GitHub Actions workflow
(`.github/workflows/ci.yml`) that installs dependencies, builds, and runs the
test suite for the service.
