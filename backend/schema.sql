CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN ('pending', 'active', 'unsubscribed')),
  confirmation_hash TEXT,
  confirmation_expires INTEGER,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  generation TEXT NOT NULL,
  last_requested INTEGER NOT NULL,
  confirmed_at INTEGER
);

CREATE TABLE IF NOT EXISTS seen_posts (
  url TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  first_seen INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS deliveries (
  email TEXT NOT NULL,
  generation TEXT NOT NULL,
  post_url TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'sending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt INTEGER,
  claimed_until INTEGER,
  sent_at INTEGER,
  PRIMARY KEY (email, generation, post_url)
);

CREATE TABLE IF NOT EXISTS quotas (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
