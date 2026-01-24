CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO projects (id, name, description, url) VALUES
  ('proj-1', 'api.do', 'Opinionated Hono-based API framework for Cloudflare Workers', 'https://api.do'),
  ('proj-2', 'oauth.do', 'OAuth authentication for Cloudflare Workers', 'https://oauth.do'),
  ('proj-3', 'rpc.do', 'RPC framework for service bindings', 'https://rpc.do');
