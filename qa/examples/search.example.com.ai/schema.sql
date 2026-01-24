-- Articles table for full-text search
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT DEFAULT 'technology',
  tags TEXT, -- JSON array stored as text
  published_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  views INTEGER DEFAULT 0
);

-- Full-text search virtual table using FTS5
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  title,
  content,
  author,
  tags,
  content='articles',
  content_rowid='rowid'
);

-- Triggers to keep FTS index in sync with articles table
CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts(rowid, title, content, author, tags)
  VALUES (NEW.rowid, NEW.title, NEW.content, NEW.author, NEW.tags);
END;

CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, content, author, tags)
  VALUES ('delete', OLD.rowid, OLD.title, OLD.content, OLD.author, OLD.tags);
END;

CREATE TRIGGER IF NOT EXISTS articles_au AFTER UPDATE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, content, author, tags)
  VALUES ('delete', OLD.rowid, OLD.title, OLD.content, OLD.author, OLD.tags);
  INSERT INTO articles_fts(rowid, title, content, author, tags)
  VALUES (NEW.rowid, NEW.title, NEW.content, NEW.author, NEW.tags);
END;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);

-- Sample data for testing
INSERT INTO articles (id, title, content, author, category, tags, views) VALUES
  (
    'article-1',
    'Introduction to Full-Text Search',
    'Full-text search enables users to find documents based on their content. Unlike simple string matching, full-text search uses techniques like tokenization, stemming, and ranking to provide relevant results. This article covers the fundamentals of building search functionality.',
    'Alice Johnson',
    'technology',
    '["search", "database", "indexing"]',
    1250
  ),
  (
    'article-2',
    'BM25 Ranking Algorithm Explained',
    'BM25 (Best Matching 25) is a ranking function used by search engines to estimate the relevance of documents. It considers term frequency, document length, and inverse document frequency to compute a relevance score.',
    'Bob Smith',
    'technology',
    '["algorithms", "search", "ranking"]',
    890
  ),
  (
    'article-3',
    'Building Search-Driven Applications',
    'Modern applications often require powerful search capabilities. This guide covers best practices for implementing search features, including autocomplete, faceted search, and result highlighting. Learn how to create intuitive search experiences.',
    'Alice Johnson',
    'tutorials',
    '["search", "development", "best-practices"]',
    2100
  ),
  (
    'article-4',
    'Understanding Fuzzy Matching',
    'Fuzzy matching allows search systems to find results even when the query contains typos or misspellings. Common algorithms include Levenshtein distance and phonetic matching like Soundex.',
    'Carol Williams',
    'technology',
    '["search", "algorithms", "fuzzy-matching"]',
    560
  ),
  (
    'article-5',
    'Search Performance Optimization',
    'Optimizing search performance involves proper indexing strategies, query caching, and infrastructure tuning. Learn how to scale your search system for millions of documents while maintaining sub-second response times.',
    'David Lee',
    'tutorials',
    '["performance", "optimization", "scaling"]',
    1800
  );
