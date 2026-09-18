# Mailing list setup

Status: setup in progress. The website form remains inactive until the backend
is deployed and signup, confirmation, unsubscribe, and delivery checks pass.

## Cloudflare resources

- Account ID: `1613ee30b836d4484822bc67a61fa9bd`
- D1 database: `blog-subscribers`
- Database ID: `bfec8caf-b89a-42dd-a73f-569a8bc91cd2`
- Jurisdiction: EU
- Database created September 17, 2026; tables deployed.
- Worker `blog-updates` created with the default Hello World template. The local
  `worker.js` has not yet been deployed.
- Worker URL: `https://blog-updates.sencan-weston.workers.dev`
- D1 database is bound to the Worker as `DB`.
- `RESEND_API_KEY` has been added as a Worker secret.

## Email delivery

- Provider: Resend
- Sending domain: `sencan.ch` (user confirmed verification)
- Receiving: disabled
- Sending-only API key is installed as a Cloudflare Worker secret named
  `RESEND_API_KEY`. Never commit or paste keys in chat.

## Remaining implementation

Deploy `worker.js` with `wrangler deploy` from this folder; the cron schedule is
defined in `wrangler.toml`. Publish the website's `/updates.json` before the
first scheduled run so existing posts are recorded as the baseline. Test signup,
confirmation, unsubscribe, and a sample new-post delivery. Only then set the
website's `PUBLIC_SUBSCRIBE_URL` to the Worker `/subscribe` endpoint.

GitHub Pages continues to host the website. No nameserver change is required.
