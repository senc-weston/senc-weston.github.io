import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from './worker.js';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  return {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        first() { return statement.get(...values) ?? null; },
        all() { return { results: statement.all(...values) }; },
        run() { const result = statement.run(...values); return { meta: { changes: Number(result.changes) } }; },
      };
    },
  };
}

test('confirmation, first-run baseline, new-post deduplication and unsubscribe', async () => {
  const env = { DB: database(), RESEND_API_KEY: 'test-only' };
  const messages = [];
  let posts = [{ url: 'https://sencan.ch/blog/old/', title: 'Old post', description: '' }];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (url === 'https://sencan.ch/updates.json') return Response.json({ posts });
    if (url === 'https://api.resend.com/emails') {
      messages.push({ ...JSON.parse(options.body), key: options.headers['idempotency-key'] });
      return Response.json({ id: crypto.randomUUID() });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  try {
    await worker.scheduled(null, env);
    assert.equal(messages.length, 0, 'existing posts do not send');
    const signup = new Request('https://blog-updates.sencan-weston.workers.dev/subscribe', {
      method: 'POST', headers: { origin: 'https://sencan.ch', 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': '192.0.2.1' },
      body: 'email=reader%40example.com',
    });
    assert.match(await (await worker.fetch(signup, env)).text(), /Check your inbox/);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].subject, 'Confirm your RoboBlog updates');
    const confirmUrl = messages[0].html.match(/href="([^"]+\/confirm\?token=[^"]+)"/)[1];
    const confirmation = await worker.fetch(new Request(confirmUrl, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: new URL(confirmUrl).searchParams.get('token') }) }), env);
    assert.match(await confirmation.text(), /Subscribed/);
    posts = [...posts, { url: 'https://sencan.ch/blog/new/', title: 'New post', description: 'A project update' }];
    await worker.scheduled(null, env);
    await worker.scheduled(null, env);
    assert.equal(messages.length, 2, 'new post sends exactly once');
    assert.match(messages[1].html, /Unsubscribe/);
    const token = new URL(messages[1].html.match(/href="([^"]+\/unsubscribe\?token=[^"]+)"/)[1]).searchParams.get('token');
    const unsub = await worker.fetch(new Request('https://blog-updates.sencan-weston.workers.dev/unsubscribe', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }),
    }), env);
    assert.match(await unsub.text(), /Unsubscribed/);
    posts.push({ url: 'https://sencan.ch/blog/later/', title: 'Later', description: '' });
    await worker.scheduled(null, env);
    assert.equal(messages.length, 2, 'unsubscribed address receives no further posts');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
