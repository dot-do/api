CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  price REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create index for searchable fields
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);

-- Sample data for testing
INSERT INTO items (id, name, description, category, price) VALUES
  ('item-1', 'Basic Widget', 'A simple widget for everyday use', 'general', 9.99),
  ('item-2', 'Premium Widget', 'High-quality premium widget', 'premium', 49.99),
  ('item-3', 'Archived Item', 'No longer available', 'archived', NULL);
