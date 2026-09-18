const SITE = 'https://sencan.ch';
const SENDER = "Sencan's RoboBlog <updates@sencan.ch>";
const MAX_DAILY_EMAILS = 90; // Resend's free tier allows 100/day.

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

function page(title, message, action) {
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{font:1rem/1.6 system-ui,sans-serif;max-width:36rem;margin:4rem auto;padding:0 1.5rem;color:#17202a}button{font:inherit;padding:.6rem 1rem;cursor:pointer}a{color:#1765a2}</style><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>${action ?? ''}<p><a href="${SITE}">Back to the blog</a></p></html>`, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff' },
  });
}

async function sha(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

async function quota(db, key, limit, expires) {
  const result = await db.prepare(`INSERT INTO quotas (key,count,expires) VALUES (?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count < ? RETURNING count`)
    .bind(key, expires, limit).first();
  return !!result;
}

async function send(env, to, subject, html, idempotencyKey) {
  if (!env.RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY');
  const today = new Date().toISOString().slice(0, 10);
  if (!(await quota(env.DB, `out:${today}`, MAX_DAILY_EMAILS, Date.now() + 172800000))) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify({ from: SENDER, to: [to], subject, html }),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}`);
  return true;
}

async function subscribe(request, env) {
  if (request.headers.get('origin') !== SITE) return page('Unable to subscribe', 'Please use the form on the blog.');
  if (Number(request.headers.get('content-length') || 0) > 4096) return page('Unable to subscribe', 'Request too large.');
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return page('Check your email address', 'Enter a valid email address and try again.');
  const now = Date.now();
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const ipKey = await sha(ip);
  if (!(await quota(env.DB, `signup-ip:${ipKey}:${Math.floor(now / 3600000)}`, 5, now + 7200000))) return page('Try again later', 'Too many requests from this connection.');
  if (!(await quota(env.DB, `signup-email:${await sha(email)}:${Math.floor(now / 86400000)}`, 2, now + 172800000))) return page('Check your inbox', 'If you can subscribe, a confirmation email will arrive shortly.');
  const existing = await env.DB.prepare('SELECT state FROM subscribers WHERE email=?').bind(email).first();
  if (existing?.state === 'active') return page('Check your inbox', 'If you can subscribe, a confirmation email will arrive shortly.');
  const token = crypto.randomUUID() + crypto.randomUUID();
  const generation = crypto.randomUUID();
  const unsubscribeToken = crypto.randomUUID() + crypto.randomUUID();
  const tokenHash = await sha(token);
  await env.DB.prepare(`INSERT INTO subscribers (email,state,confirmation_hash,confirmation_expires,unsubscribe_token,generation,last_requested)
    VALUES (?,'pending',?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET state='pending',confirmation_hash=excluded.confirmation_hash,
    confirmation_expires=excluded.confirmation_expires,unsubscribe_token=excluded.unsubscribe_token,generation=excluded.generation,
    last_requested=excluded.last_requested,confirmed_at=NULL`)
    .bind(email, tokenHash, now + 86400000, unsubscribeToken, generation, now).run();
  const link = `https://blog-updates.sencan-weston.workers.dev/confirm?token=${encodeURIComponent(token)}`;
  const sent = await send(env, email, "Confirm your RoboBlog updates", `<p>Click below to confirm you want an email when I publish a new blog post.</p><p><a href="${link}">Confirm subscription</a></p><p>If you didn't request this, ignore this email. This link expires in 24 hours.</p>`, `confirm-${generation}`);
  return sent ? page('Check your inbox', 'Click the confirmation link in the email we sent you.') : page('Try again tomorrow', 'The daily email limit has been reached.');
}

async function confirm(request, env, method) {
  const url = new URL(request.url);
  const token = method === 'POST' ? String((await request.formData()).get('token') ?? '') : String(url.searchParams.get('token') ?? '');
  if (!/^[a-f0-9-]{72}$/.test(token)) return page('Invalid link', 'This confirmation link is invalid.');
  const hash = await sha(token);
  if (method === 'GET') {
    const row = await env.DB.prepare("SELECT 1 FROM subscribers WHERE confirmation_hash=? AND state='pending' AND confirmation_expires>?").bind(hash, Date.now()).first();
    if (!row) return page('Link expired', 'Please enter your email address on the blog again.');
    return page('Confirm updates', 'Click below to confirm that you want new-post emails.', `<form method="post" action="/confirm"><input type="hidden" name="token" value="${escapeHtml(token)}"><button>Confirm subscription</button></form>`);
  }
  const result = await env.DB.prepare("UPDATE subscribers SET state='active',confirmation_hash=NULL,confirmation_expires=NULL,confirmed_at=? WHERE confirmation_hash=? AND state='pending' AND confirmation_expires>? RETURNING email")
    .bind(Date.now(), hash, Date.now()).first();
  return result ? page('Subscribed', 'You will receive an email when I publish a new post.') : page('Link expired', 'Please enter your email address on the blog again.');
}

async function unsubscribe(request, env, method) {
  const url = new URL(request.url);
  const token = method === 'POST' ? String((await request.formData()).get('token') ?? '') : String(url.searchParams.get('token') ?? '');
  if (!/^[a-f0-9-]{72}$/.test(token)) return page('Invalid link', 'This unsubscribe link is invalid.');
  const row = await env.DB.prepare("SELECT email FROM subscribers WHERE unsubscribe_token=? AND state='active'").bind(token).first();
  if (!row) return page('Already unsubscribed', 'This address is no longer receiving updates.');
  if (method === 'GET') return page('Unsubscribe', 'Click below to stop receiving blog updates.', `<form method="post" action="/unsubscribe"><input type="hidden" name="token" value="${escapeHtml(token)}"><button>Unsubscribe</button></form>`);
  await env.DB.prepare("UPDATE subscribers SET state='unsubscribed',generation=?,confirmation_hash=NULL WHERE unsubscribe_token=? AND state='active'").bind(crypto.randomUUID(), token).run();
  return page('Unsubscribed', 'You will no longer receive blog updates.');
}

async function checkPosts(env) {
  const response = await fetch(`${SITE}/updates.json`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Post list returned ${response.status}`);
  const { posts } = await response.json();
  if (!Array.isArray(posts) || posts.length > 1000 || posts.some((p) => !p.url?.startsWith(`${SITE}/blog/`) || typeof p.title !== 'string' || typeof p.description !== 'string')) throw new Error('Invalid post list');
  const initialized = await env.DB.prepare("SELECT value FROM settings WHERE key='initialized'").first();
  if (!initialized) {
    for (const post of posts) await env.DB.prepare('INSERT OR IGNORE INTO seen_posts (url,title,description,first_seen) VALUES (?,?,?,?)').bind(post.url, post.title, post.description, Date.now()).run();
    await env.DB.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES ('initialized','1')").run();
    return;
  }
  for (const post of posts) {
    const now = Date.now();
    const inserted = await env.DB.prepare('INSERT OR IGNORE INTO seen_posts (url,title,description,first_seen) VALUES (?,?,?,?)').bind(post.url, post.title, post.description, now).run();
    if (inserted.meta.changes !== 1) continue;
    await env.DB.prepare(`INSERT OR IGNORE INTO deliveries (email,generation,post_url,state)
      SELECT email,generation,?,'pending' FROM subscribers WHERE state='active' AND confirmed_at<=?`)
      .bind(post.url, now).run();
  }
}

async function deliver(env) {
  const rows = await env.DB.prepare(`SELECT d.email,d.generation,d.post_url,d.attempts,d.first_attempt,p.title,p.description,s.unsubscribe_token
    FROM deliveries d JOIN subscribers s ON s.email=d.email AND s.generation=d.generation AND s.state='active'
    JOIN seen_posts p ON p.url=d.post_url WHERE d.state='pending' OR (d.state='sending' AND d.claimed_until<?)
    ORDER BY p.first_seen,d.email LIMIT 30`).bind(Date.now()).all();
  for (const row of rows.results) {
    const now = Date.now();
    if (row.first_attempt && now - row.first_attempt > 20 * 3600000) {
      await env.DB.prepare("UPDATE deliveries SET state='failed' WHERE email=? AND generation=? AND post_url=?").bind(row.email,row.generation,row.post_url).run();
      continue;
    }
    const claim = await env.DB.prepare(`UPDATE deliveries SET state='sending',attempts=attempts+1,first_attempt=COALESCE(first_attempt,?),claimed_until=?
      WHERE email=? AND generation=? AND post_url=? AND (state='pending' OR (state='sending' AND claimed_until<?)) RETURNING attempts`)
      .bind(now,now+300000,row.email,row.generation,row.post_url,now).first();
    if (!claim) continue;
    const unsub = `https://blog-updates.sencan-weston.workers.dev/unsubscribe?token=${encodeURIComponent(row.unsubscribe_token)}`;
    const html = `<p>New post on Sencan's RoboBlog:</p><h2>${escapeHtml(row.title)}</h2><p>${escapeHtml(row.description)}</p><p><a href="${escapeHtml(row.post_url)}">Read the post</a></p><p style="font-size:small"><a href="${unsub}">Unsubscribe</a></p>`;
    try {
      const sent = await send(env,row.email,`New post: ${row.title}`,html,`post-${await sha(`${row.email}|${row.generation}|${row.post_url}`)}`);
      if (!sent) {
        await env.DB.prepare("UPDATE deliveries SET state='pending',claimed_until=NULL WHERE email=? AND generation=? AND post_url=?").bind(row.email,row.generation,row.post_url).run();
        break;
      }
      await env.DB.prepare("UPDATE deliveries SET state='sent',sent_at=?,claimed_until=NULL WHERE email=? AND generation=? AND post_url=?").bind(now,row.email,row.generation,row.post_url).run();
    } catch (error) {
      console.error('Delivery failed', error.message);
      await env.DB.prepare("UPDATE deliveries SET state='pending',claimed_until=NULL WHERE email=? AND generation=? AND post_url=?").bind(row.email,row.generation,row.post_url).run();
      break;
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/health' && request.method === 'GET') return new Response('ok');
      if (!env.DB) throw new Error('Missing D1 binding');
      if (url.pathname === '/subscribe' && request.method === 'POST') return await subscribe(request, env);
      if (url.pathname === '/confirm' && ['GET','POST'].includes(request.method)) return await confirm(request,env,request.method);
      if (url.pathname === '/unsubscribe' && ['GET','POST'].includes(request.method)) return await unsubscribe(request,env,request.method);
      return new Response('Not found', { status: 404 });
    } catch (error) {
      console.error('Request failed', error.message);
      return page('Something went wrong', 'Please try again later.');
    }
  },
  async scheduled(_event, env) {
    await checkPosts(env);
    await deliver(env);
  },
};
