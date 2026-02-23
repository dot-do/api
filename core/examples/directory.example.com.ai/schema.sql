CREATE TABLE IF NOT EXISTS apis (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  domain TEXT,
  url TEXT,
  category TEXT,
  featured INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  auth_required INTEGER DEFAULT 0,
  docs_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO apis (id, name, description, domain, url, category, featured) VALUES
  ('api-1', 'api.do', 'Opinionated API framework for Cloudflare Workers', 'api.do', 'https://api.do', 'frameworks', 1),
  ('api-2', 'oauth.do', 'OAuth authentication provider', 'oauth.do', 'https://oauth.do', 'auth', 1),
  ('api-3', 'rpc.do', 'RPC framework for service bindings', 'rpc.do', 'https://rpc.do', 'frameworks', 1),
  ('api-4', 'llm.do', 'LLM gateway and orchestration', 'llm.do', 'https://llm.do', 'ai', 1),
  ('api-5', 'db.do', 'Database abstraction layer', 'db.do', 'https://db.do', 'data', 0),
  ('api-6', 'queue.do', 'Message queue service', 'queue.do', 'https://queue.do', 'messaging', 0),
  ('api-7', 'cron.do', 'Scheduled task execution', 'cron.do', 'https://cron.do', 'scheduling', 0),
  ('api-8', 'storage.do', 'Object storage API', 'storage.do', 'https://storage.do', 'storage', 0),
  ('api-9', 'search.do', 'Full-text search service', 'search.do', 'https://search.do', 'search', 1),
  ('api-10', 'email.do', 'Transactional email service', 'email.do', 'https://email.do', 'messaging', 0);
