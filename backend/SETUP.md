# Mailing list setup

Status: Worker deployed and the website form enabled. A live test signup was
sent to the owner's address on September 18, 2026; confirmation and sample
delivery still need to be checked.

## Cloudflare resources

- Account ID: `1613ee30b836d4484822bc67a61fa9bd`
- D1 database: `blog-subscribers`
- Database ID: `bfec8caf-b89a-42dd-a73f-569a8bc91cd2`
- Jurisdiction: EU
- Database created September 17, 2026; tables deployed.
- Worker `blog-updates` deployed from `worker.js` with a ten-minute cron.
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

The website's `/updates.json` is published and the existing `background` post
was recorded in `seen_posts` as the baseline. The GitHub Pages workflow sets
`PUBLIC_SUBSCRIBE_URL` to the Worker `/subscribe` endpoint. Confirm the test
signup, send one sample notification, then unsubscribe and remove the test
subscriber and its delivery rows. The Worker only sends a post to addresses
that confirmed before it was first seen.

GitHub Pages continues to host the website. No nameserver change is required.
