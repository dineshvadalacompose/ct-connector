# ct-connector event

A commercetools Connect event application. It listens for a Changes Subscription that fires
whenever a Product is created or updated in the real commercetools project, logs the decoded
notification to the console, and forwards it to Upstash QStash for reliable delivery to a
separate proof app.

## Run it locally

```
npm install
npm run start:dev
```

The app listens on port 8080 by default (set `PORT` in a `.env` file to change it). Once running,
open `http://localhost:8080/` or `http://localhost:8080/event` in a browser to confirm it's alive.

You can exercise the decode-and-log logic directly, without a real deployment, by sending a
hand-crafted Pub/Sub push envelope to `POST /event` (for example with `curl` or Postman) - see
`tests/server.test.ts` for the exact shape.

## Run the tests

```
npm test
```

## Connecting this to a real commercetools project

When commercetools Connect deploys this app for real, it automatically provisions a Pub/Sub topic
and injects its name and project ID into the environment as `CONNECT_GCP_TOPIC_NAME` and
`CONNECT_GCP_PROJECT_ID` - these aren't something you configure by hand. On every deploy, the
`connector:post-deploy` script uses those values to register (or confirm) a Subscription on the
real commercetools project pointing at that topic, so every Product create or update gets pushed
here. If this deployment is ever removed, `connector:pre-undeploy` automatically removes that
Subscription first, so the real commercetools project doesn't keep trying to deliver messages to a
queue that no longer exists.

There's no local-tunnel trick for testing this end-to-end - a Pub/Sub topic and push subscription
only exist once this app is actually deployed by commercetools Connect. So running this locally
only lets you test the `/event` decode-and-log logic directly with a hand-crafted request, not a
real end-to-end delivery from commercetools. To see a real Product event flow through, you need to
deploy this connector for real and then create or update a product in that commercetools project.

## Forwarding events to QStash

Besides logging every decoded event, this app also forwards it to Upstash QStash, which delivers
it (with its own retries) to a separate small proof app
([qstash-receiver](https://github.com/dineshvadalacompose/qstash-receiver), deployed on Vercel)
that stores and displays what it receives - so delivery can be visually confirmed on that app's
page, not just inferred from this app's own logs.

This requires two settings: `QSTASH_DESTINATION_URL` (the `/api/receive` address of the
qstash-receiver app) and `QSTASH_TOKEN` (the credential used to talk to QStash). Decoding and
forwarding fail differently on purpose: a message that fails to decode will never decode
successfully no matter how many times it's retried, so it's still acknowledged (204) and just
logged as an error. But if forwarding to QStash fails, that's likely a temporary hiccup, so the app
responds with an error status instead, which tells commercetools to redeliver the same message
later for another attempt.

One consequence worth knowing: forwarding to the same public address on every redeliver of an
undecodable message doesn't loop forever, because QStash forwards the bare notification JSON, not
a Pub/Sub envelope - when that lands back on `/event` it fails to decode (no `message.data`) and
is acknowledged without forwarding again. See `src/server.ts`'s comment on this for the exact
reasoning.

## What's not done yet

`POST /event` has **no authentication at all**. Anyone who discovers this endpoint's public URL
can post a fake notification and this app will decode, log, and forward it as if it were real.
Pub/Sub push subscriptions support an optional OIDC token the endpoint could verify to confirm a
request actually came from Pub/Sub - not implemented here, since this app's job is currently only
to log and forward what it receives rather than act on it directly. Worth adding before this
endpoint is ever trusted to trigger a real side effect.

The retry-on-forward-failure choice treats every QStash error the same way (redeliver later). A
genuinely permanent problem - a revoked `QSTASH_TOKEN`, or QStash rejecting the destination URL -
gets the same treatment as a brief network hiccup, so it would keep redelivering and re-failing
the same notification indefinitely rather than giving up after a permanent failure is confirmed.
Fine for now; would need distinguishing before this handles real traffic at any volume.

This design can also forward the same notification to QStash more than once: if the forward
request actually reaches QStash and succeeds, but the response is lost before this app sees it
(a dropped connection), this app still reports a failure, commercetools redelivers the original
message, and it gets forwarded again. QStash's own delivery guarantee is at-least-once for the
same reason - this app just inherits that property rather than adding deduplication on top of it.
