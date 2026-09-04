# ct-connector

A commercetools Connect **Event** application. It watches for Product create/update
changes in a commercetools project, logs the decoded notification, and forwards it to
Upstash QStash for reliable delivery to a separate proof app
([qstash-receiver](https://github.com/dineshvadalacompose/qstash-receiver)) that displays
what actually arrived.

## Repository layout

- `connect.yaml` - the commercetools Connect deployment manifest at the repo root. It
  declares this repo's single deployable component (`event`), the configuration values
  it needs (project key, auth/API URLs, scopes, client credentials, and the QStash
  destination/token), and its deploy/undeploy hooks.
- `event/` - the actual application code (an Express app written in TypeScript), its
  tests, and the scripts that register/deregister the commercetools Subscription this
  app needs to receive Product notifications.

See [`event/README.md`](event/README.md) for the full walkthrough: running it locally,
running its tests, and how the Subscription registration and QStash forwarding work.

## Requirements

- Node.js version 24 (see `.nvmrc`).

## Quick start

From inside the `event/` directory:

```
npm install
npm run start:dev
```

This starts the app locally. In a separate terminal, `npm test` runs its test suite.
Testing the full Subscription-delivery flow requires a real deployment - see
[`event/README.md`](event/README.md).

## What's not done yet

- `POST /event` has no authentication (no shared secret, no Pub/Sub OIDC token check) -
  anyone who discovers its public URL can post a fake notification. Acceptable while this
  app only logs and forwards what it receives; revisit before it triggers any real side
  effect. See `event/README.md`.
- A forward-to-QStash failure that's actually permanent (a revoked token, a rejected
  destination) gets retried indefinitely rather than failing fast, and a lost response
  after a successful QStash accept can cause a duplicate forward. See `event/README.md`
  for the full reasoning.
- The connector and its deployment were both created without a human-readable "key" (only
  an internal id) for the original `service`+`event` deployment; the current `event`-only
  deployment (recreated after removing `service`) does have a real key
  (`ct-connector-sandbox`), but the connector itself still doesn't. Worth giving it one if
  this project is ever recreated from scratch.

## Continuous integration

Every push and pull request runs a GitHub Actions workflow
(`.github/workflows/ci.yml`) that installs dependencies, builds, and runs the
test suite for the event app.

## How to release

This project is deployed through commercetools Connect's own hosting - no local tunnel
needed for real use. Shipping a change is a normal commit/push, plus one extra step to
actually make it go live:

1. Make your changes, commit, and push to `main` as usual. This alone does
   **not** touch the live app - pushing to `main` only runs the CI checks above.
2. Decide a version number for the release: bump the last number for a small
   fix (`v1.5.0` -> `v1.5.1`), the middle number for a new feature (`v1.5.0`
   -> `v1.6.0`).
3. Create and push a version tag - this is the step that actually ships it:
   ```
   git tag -a v1.5.1 -m "short description of what changed"
   git push origin v1.5.1
   ```
4. Pushing a tag matching `v*` triggers
   `.github/workflows/deploy-connector.yml`, which publishes that tagged code
   to the connector and redeploys the running instance with
   `--updateConnector` so it actually picks up the new version. Watch its
   progress under the repo's **Actions** tab.
5. Once it's green, the live app is running the new code. Worth
   double-checking with a real request if the change is significant.
