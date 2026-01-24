/**
 * search.example.com.ai - Full-Text Search API Example
 *
 * Demonstrates the pg-search package with:
 * - BM25 full-text search with ranking
 * - Search highlighting and fuzzy matching
 * - Autocomplete suggestions
 * - Faceted search
 * - MCP tools with embedded tests
 * - Custom routes for health and reindexing
 */

import { API } from 'api.do'
import type { Context } from 'hono'

// Article document type for search
interface Article {
  id: string
  title: string
  content: string
  author: string
  category: string
  tags: string[]
  publishedAt: string
  views: number
}

// In-memory search store for demo (would use SearchDO in production)
const searchIndex: Map<string, Article> = new Map()

// Simple BM25-like scoring function for demo
function computeScore(doc: Article, term: string): number {
  const termLower = term.toLowerCase()
  let score = 0

  // Title matches are worth more
  if (doc.title.toLowerCase().includes(termLower)) {
    score += 10
  }

  // Content matches
  const contentMatches = (doc.content.toLowerCase().match(new RegExp(termLower, 'g')) || []).length
  score += contentMatches * 2

  // Author matches
  if (doc.author.toLowerCase().includes(termLower)) {
    score += 5
  }

  // Tag matches
  if (doc.tags.some((tag) => tag.toLowerCase().includes(termLower))) {
    score += 3
  }

  return score
}

// Highlight matching terms in text
function highlight(text: string, term: string, tag = 'mark'): string {
  if (!term) return text
  const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, `<${tag}>$1</${tag}>`)
}

// Fuzzy match using Levenshtein distance
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
      }
    }
  }

  return matrix[b.length][a.length]
}

// Check if two strings are fuzzy matches
function isFuzzyMatch(str: string, term: string, threshold = 2): boolean {
  const strLower = str.toLowerCase()
  const termLower = term.toLowerCase()

  // Exact substring match
  if (strLower.includes(termLower)) return true

  // Check words individually
  const words = strLower.split(/\s+/)
  return words.some((word) => levenshteinDistance(word, termLower) <= threshold)
}

// Generate search suggestions from indexed content
function generateSuggestions(prefix: string, limit = 5): string[] {
  const prefixLower = prefix.toLowerCase()
  const suggestions = new Set<string>()

  for (const doc of searchIndex.values()) {
    // Add matching titles
    if (doc.title.toLowerCase().startsWith(prefixLower)) {
      suggestions.add(doc.title)
    }

    // Add matching words from titles
    const titleWords = doc.title.split(/\s+/)
    for (const word of titleWords) {
      if (word.toLowerCase().startsWith(prefixLower)) {
        suggestions.add(word)
      }
    }

    // Add matching tags
    for (const tag of doc.tags) {
      if (tag.toLowerCase().startsWith(prefixLower)) {
        suggestions.add(tag)
      }
    }

    // Add matching author names
    if (doc.author.toLowerCase().startsWith(prefixLower)) {
      suggestions.add(doc.author)
    }

    if (suggestions.size >= limit * 2) break
  }

  return Array.from(suggestions).slice(0, limit)
}

// Compute facets from search results
function computeFacets(articles: Article[]): Record<string, Record<string, number>> {
  const facets: Record<string, Record<string, number>> = {
    category: {},
    author: {},
    tags: {},
  }

  for (const article of articles) {
    // Category facet
    facets.category[article.category] = (facets.category[article.category] || 0) + 1

    // Author facet
    facets.author[article.author] = (facets.author[article.author] || 0) + 1

    // Tags facet
    for (const tag of article.tags) {
      facets.tags[tag] = (facets.tags[tag] || 0) + 1
    }
  }

  return facets
}

// Initialize with sample data
function initializeSampleData() {
  const sampleArticles: Omit<Article, 'id'>[] = [
    {
      title: 'Introduction to Full-Text Search',
      content:
        'Full-text search enables users to find documents based on their content. Unlike simple string matching, full-text search uses techniques like tokenization, stemming, and ranking to provide relevant results.',
      author: 'Alice Johnson',
      category: 'technology',
      tags: ['search', 'database', 'indexing'],
      publishedAt: '2024-01-15T10:00:00Z',
      views: 1250,
    },
    {
      title: 'BM25 Ranking Algorithm Explained',
      content:
        'BM25 (Best Matching 25) is a ranking function used by search engines to estimate the relevance of documents. It considers term frequency, document length, and inverse document frequency.',
      author: 'Bob Smith',
      category: 'technology',
      tags: ['algorithms', 'search', 'ranking'],
      publishedAt: '2024-02-20T14:30:00Z',
      views: 890,
    },
    {
      title: 'Building Search-Driven Applications',
      content:
        'Modern applications often require powerful search capabilities. This guide covers best practices for implementing search features, including autocomplete, faceted search, and result highlighting.',
      author: 'Alice Johnson',
      category: 'tutorials',
      tags: ['search', 'development', 'best-practices'],
      publishedAt: '2024-03-10T09:00:00Z',
      views: 2100,
    },
    {
      title: 'Understanding Fuzzy Matching',
      content:
        'Fuzzy matching allows search systems to find results even when the query contains typos or misspellings. Common algorithms include Levenshtein distance and phonetic matching.',
      author: 'Carol Williams',
      category: 'technology',
      tags: ['search', 'algorithms', 'fuzzy-matching'],
      publishedAt: '2024-04-05T11:15:00Z',
      views: 560,
    },
    {
      title: 'Search Performance Optimization',
      content:
        'Optimizing search performance involves proper indexing strategies, query caching, and infrastructure tuning. Learn how to scale your search system for millions of documents.',
      author: 'David Lee',
      category: 'tutorials',
      tags: ['performance', 'optimization', 'scaling'],
      publishedAt: '2024-05-12T16:45:00Z',
      views: 1800,
    },
  ]

  for (let i = 0; i < sampleArticles.length; i++) {
    const id = `article-${i + 1}`
    searchIndex.set(id, { id, ...sampleArticles[i] })
  }
}

// Initialize sample data on module load
initializeSampleData()

export default API({
  name: 'search.example.com.ai',
  description: 'Full-text search API demonstrating pg-search capabilities',
  version: '1.0.0',

  auth: { mode: 'optional' },

  // MCP tools with embedded tests
  mcp: {
    name: 'search.qa-mcp',
    version: '1.0.0',
    tools: [
      {
        name: 'articles.create',
        description: 'Create and index a new article for search',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, description: 'Article title' },
            content: { type: 'string', minLength: 1, description: 'Article content' },
            author: { type: 'string', minLength: 1, description: 'Author name' },
            category: {
              type: 'string',
              enum: ['technology', 'tutorials', 'news', 'opinion'],
              description: 'Article category',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Article tags for filtering',
            },
          },
          required: ['title', 'content', 'author'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            author: { type: 'string' },
            category: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            publishedAt: { type: 'string', format: 'date-time' },
            views: { type: 'number' },
          },
        },
        examples: [
          {
            name: 'create technology article',
            input: {
              title: 'Getting Started with Search',
              content: 'A comprehensive guide to implementing search...',
              author: 'John Doe',
              category: 'technology',
              tags: ['search', 'tutorial'],
            },
            output: {
              id: 'article-6',
              title: 'Getting Started with Search',
              category: 'technology',
            },
          },
        ],
        tests: [
          {
            name: 'creates article with valid data',
            tags: ['smoke', 'crud'],
            input: {
              title: 'Test Article',
              content: 'This is test content for the article.',
              author: 'Test Author',
              category: 'technology',
              tags: ['test'],
            },
            expect: {
              status: 'success',
              output: {
                title: 'Test Article',
                author: 'Test Author',
                category: 'technology',
              },
              match: 'partial',
            },
          },
          {
            name: 'creates article with default category',
            tags: ['crud'],
            input: {
              title: 'Minimal Article',
              content: 'Just the basics.',
              author: 'Simple Author',
            },
            expect: {
              status: 'success',
              output: {
                title: 'Minimal Article',
                category: 'technology',
              },
              match: 'partial',
            },
          },
          {
            name: 'rejects empty title',
            tags: ['validation', 'negative'],
            input: {
              title: '',
              content: 'Some content',
              author: 'Author',
            },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'rejects missing content',
            tags: ['validation', 'negative'],
            input: {
              title: 'Title Only',
              author: 'Author',
            },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'rejects invalid category',
            tags: ['validation', 'negative'],
            input: {
              title: 'Test',
              content: 'Content',
              author: 'Author',
              category: 'invalid-category',
            },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
        ],
        handler: async (input: unknown) => {
          const { title, content, author, category, tags } = input as {
            title?: string
            content?: string
            author?: string
            category?: string
            tags?: string[]
          }

          // Validation
          if (!title || title.length === 0) {
            throw Object.assign(new Error('Title is required'), { code: 'VALIDATION_ERROR' })
          }

          if (!content || content.length === 0) {
            throw Object.assign(new Error('Content is required'), { code: 'VALIDATION_ERROR' })
          }

          if (!author || author.length === 0) {
            throw Object.assign(new Error('Author is required'), { code: 'VALIDATION_ERROR' })
          }

          const validCategories = ['technology', 'tutorials', 'news', 'opinion']
          if (category && !validCategories.includes(category)) {
            throw Object.assign(new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`), {
              code: 'VALIDATION_ERROR',
            })
          }

          const id = `article-${Date.now()}`
          const article: Article = {
            id,
            title,
            content,
            author,
            category: category || 'technology',
            tags: tags || [],
            publishedAt: new Date().toISOString(),
            views: 0,
          }

          searchIndex.set(id, article)
          return article
        },
      },
      {
        name: 'articles.search',
        description: 'Search articles with BM25 ranking, highlighting, and fuzzy matching',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query term' },
            limit: { type: 'number', default: 10, minimum: 1, maximum: 100, description: 'Max results' },
            offset: { type: 'number', default: 0, minimum: 0, description: 'Pagination offset' },
            category: { type: 'string', description: 'Filter by category' },
            author: { type: 'string', description: 'Filter by author' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags (any match)' },
            highlight: { type: 'boolean', default: true, description: 'Include highlighted snippets' },
            fuzzy: { type: 'boolean', default: false, description: 'Enable fuzzy matching for typos' },
          },
          required: ['query'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            hits: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  score: { type: 'number' },
                  document: { type: 'object' },
                  highlights: { type: 'object' },
                },
              },
            },
            total: { type: 'number' },
            elapsed: { type: 'object' },
          },
        },
        examples: [
          {
            name: 'basic search',
            input: { query: 'search' },
            output: {
              hits: [{ id: 'article-1', score: 10 }],
              total: 3,
            },
          },
          {
            name: 'filtered search',
            input: { query: 'search', category: 'technology', highlight: true },
            output: {
              hits: [{ id: 'article-1', score: 10, highlights: { title: '<mark>Search</mark>' } }],
              total: 2,
            },
          },
        ],
        tests: [
          {
            name: 'returns results for valid query',
            tags: ['smoke', 'search'],
            input: { query: 'search' },
            expect: {
              status: 'success',
              output: {
                'hits': { type: 'array', minLength: 1 },
                'total': { type: 'number', gte: 1 },
              },
              match: 'partial',
            },
          },
          {
            name: 'returns empty for non-matching query',
            tags: ['search'],
            input: { query: 'xyznonexistent123' },
            expect: {
              status: 'success',
              output: {
                'hits': { type: 'array', length: 0 },
                'total': 0,
              },
              match: 'partial',
            },
          },
          {
            name: 'filters by category',
            tags: ['search', 'filtering'],
            input: { query: 'search', category: 'technology' },
            expect: {
              status: 'success',
              output: {
                'hits': { type: 'array' },
              },
              match: 'partial',
            },
          },
          {
            name: 'includes highlights when enabled',
            tags: ['search', 'highlighting'],
            input: { query: 'search', highlight: true },
            expect: {
              status: 'success',
              output: {
                'hits[0].highlights': { type: 'object' },
              },
              match: 'partial',
            },
          },
          {
            name: 'respects limit parameter',
            tags: ['search', 'pagination'],
            input: { query: 'search', limit: 2 },
            expect: {
              status: 'success',
              output: {
                'hits': { type: 'array', maxLength: 2 },
              },
              match: 'partial',
            },
          },
          {
            name: 'handles fuzzy matching for typos',
            tags: ['search', 'fuzzy'],
            input: { query: 'serch', fuzzy: true },
            expect: {
              status: 'success',
              output: {
                'hits': { type: 'array' },
              },
              match: 'partial',
            },
          },
          {
            name: 'rejects empty query',
            tags: ['validation', 'negative'],
            input: { query: '' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
        ],
        handler: async (input: unknown) => {
          const startTime = performance.now()
          const {
            query,
            limit = 10,
            offset = 0,
            category,
            author,
            tags,
            highlight: includeHighlights = true,
            fuzzy = false,
          } = input as {
            query: string
            limit?: number
            offset?: number
            category?: string
            author?: string
            tags?: string[]
            highlight?: boolean
            fuzzy?: boolean
          }

          if (!query || query.length === 0) {
            throw Object.assign(new Error('Query is required'), { code: 'VALIDATION_ERROR' })
          }

          // Get all documents and score them
          let results: Array<{ doc: Article; score: number }> = []

          for (const doc of searchIndex.values()) {
            // Apply filters
            if (category && doc.category !== category) continue
            if (author && doc.author !== author) continue
            if (tags && tags.length > 0 && !tags.some((t) => doc.tags.includes(t))) continue

            // Compute score
            let score = computeScore(doc, query)

            // Apply fuzzy matching if enabled and no exact match
            if (fuzzy && score === 0) {
              if (
                isFuzzyMatch(doc.title, query) ||
                isFuzzyMatch(doc.content, query) ||
                isFuzzyMatch(doc.author, query)
              ) {
                score = 1 // Lower score for fuzzy matches
              }
            }

            if (score > 0) {
              results.push({ doc, score })
            }
          }

          // Sort by score descending
          results.sort((a, b) => b.score - a.score)

          const total = results.length

          // Apply pagination
          results = results.slice(offset, offset + limit)

          // Build response
          const hits = results.map(({ doc, score }) => {
            const hit: {
              id: string
              score: number
              document: Article
              highlights?: Record<string, string>
            } = {
              id: doc.id,
              score,
              document: doc,
            }

            if (includeHighlights) {
              hit.highlights = {
                title: highlight(doc.title, query),
                content: highlight(doc.content.substring(0, 200), query) + '...',
              }
            }

            return hit
          })

          const elapsed = performance.now() - startTime

          return {
            hits,
            total,
            elapsed: {
              raw: elapsed,
              formatted: `${elapsed.toFixed(2)}ms`,
            },
          }
        },
      },
      {
        name: 'articles.suggest',
        description: 'Get autocomplete suggestions based on indexed content',
        inputSchema: {
          type: 'object',
          properties: {
            prefix: { type: 'string', minLength: 1, description: 'Prefix to get suggestions for' },
            limit: { type: 'number', default: 5, minimum: 1, maximum: 20, description: 'Max suggestions' },
          },
          required: ['prefix'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            suggestions: { type: 'array', items: { type: 'string' } },
            prefix: { type: 'string' },
          },
        },
        examples: [
          {
            name: 'get suggestions for "sea"',
            input: { prefix: 'sea' },
            output: { suggestions: ['search', 'Search Performance'], prefix: 'sea' },
          },
        ],
        tests: [
          {
            name: 'returns suggestions for valid prefix',
            tags: ['smoke', 'autocomplete'],
            input: { prefix: 'sea' },
            expect: {
              status: 'success',
              output: {
                'suggestions': { type: 'array' },
                'prefix': 'sea',
              },
              match: 'partial',
            },
          },
          {
            name: 'returns empty for non-matching prefix',
            tags: ['autocomplete'],
            input: { prefix: 'xyz123' },
            expect: {
              status: 'success',
              output: {
                'suggestions': { type: 'array', length: 0 },
              },
              match: 'partial',
            },
          },
          {
            name: 'respects limit parameter',
            tags: ['autocomplete'],
            input: { prefix: 's', limit: 3 },
            expect: {
              status: 'success',
              output: {
                'suggestions': { type: 'array', maxLength: 3 },
              },
              match: 'partial',
            },
          },
          {
            name: 'rejects empty prefix',
            tags: ['validation', 'negative'],
            input: { prefix: '' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
        ],
        handler: async (input: unknown) => {
          const { prefix, limit = 5 } = input as {
            prefix: string
            limit?: number
          }

          if (!prefix || prefix.length === 0) {
            throw Object.assign(new Error('Prefix is required'), { code: 'VALIDATION_ERROR' })
          }

          const suggestions = generateSuggestions(prefix, limit)

          return {
            suggestions,
            prefix,
          }
        },
      },
      {
        name: 'articles.facets',
        description: 'Get faceted counts for filtering search results',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Optional search query to filter facets' },
            facetFields: {
              type: 'array',
              items: { type: 'string', enum: ['category', 'author', 'tags'] },
              default: ['category', 'author', 'tags'],
              description: 'Fields to compute facets for',
            },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            facets: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                additionalProperties: { type: 'number' },
              },
            },
            total: { type: 'number' },
          },
        },
        examples: [
          {
            name: 'get all facets',
            input: {},
            output: {
              facets: {
                category: { technology: 3, tutorials: 2 },
                author: { 'Alice Johnson': 2 },
              },
              total: 5,
            },
          },
          {
            name: 'get facets for search results',
            input: { query: 'search' },
            output: {
              facets: { category: { technology: 2 } },
              total: 3,
            },
          },
        ],
        tests: [
          {
            name: 'returns facets for all documents',
            tags: ['smoke', 'facets'],
            input: {},
            expect: {
              status: 'success',
              output: {
                'facets.category': { type: 'object' },
                'facets.author': { type: 'object' },
                'total': { type: 'number', gte: 1 },
              },
              match: 'partial',
            },
          },
          {
            name: 'returns facets filtered by query',
            tags: ['facets', 'filtering'],
            input: { query: 'search' },
            expect: {
              status: 'success',
              output: {
                'facets': { type: 'object' },
                'total': { type: 'number' },
              },
              match: 'partial',
            },
          },
          {
            name: 'respects facetFields parameter',
            tags: ['facets'],
            input: { facetFields: ['category'] },
            expect: {
              status: 'success',
              output: {
                'facets.category': { type: 'object' },
              },
              match: 'partial',
            },
          },
        ],
        handler: async (input: unknown) => {
          const { query, facetFields = ['category', 'author', 'tags'] } = input as {
            query?: string
            facetFields?: string[]
          }

          // Get documents, optionally filtered by query
          let articles: Article[] = Array.from(searchIndex.values())

          if (query && query.length > 0) {
            articles = articles.filter((doc) => computeScore(doc, query) > 0)
          }

          // Compute all facets
          const allFacets = computeFacets(articles)

          // Filter to requested facet fields
          const facets: Record<string, Record<string, number>> = {}
          for (const field of facetFields) {
            if (allFacets[field]) {
              facets[field] = allFacets[field]
            }
          }

          return {
            facets,
            total: articles.length,
          }
        },
      },
    ],
  },

  // Testing configuration - enables /qa endpoint
  testing: {
    enabled: true,
    endpoint: '/qa',
    tags: ['example', 'search.qa', 'pg-search'],
    // REST endpoint tests
    endpoints: [
      {
        path: '/health',
        method: 'GET',
        tests: [
          {
            name: 'health check returns ok status',
            tags: ['smoke', 'health'],
            expect: {
              status: 200,
              body: {
                'data.status': 'ok',
                'data.timestamp': { type: 'string' },
              },
            },
          },
        ],
      },
      {
        path: '/',
        method: 'GET',
        tests: [
          {
            name: 'root returns API info',
            tags: ['smoke'],
            expect: {
              status: 200,
              body: {
                'api.name': 'search.example.com.ai',
                'data.name': 'search.example.com.ai',
              },
            },
          },
        ],
      },
      {
        path: '/articles/stats',
        method: 'GET',
        tests: [
          {
            name: 'stats returns index statistics',
            tags: ['smoke', 'stats'],
            expect: {
              status: 200,
              body: {
                'data.documentCount': { type: 'number', gte: 0 },
                'data.categories': { type: 'object' },
              },
            },
          },
        ],
      },
    ],
  },

  // Custom routes
  routes: (app) => {
    // Health check
    app.get('/health', (c) => {
      return c.var.respond({
        data: {
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          searchEngine: 'pg-search (demo mode)',
        },
      })
    })

    // Search stats
    app.get('/articles/stats', (c) => {
      const articles = Array.from(searchIndex.values())
      const facets = computeFacets(articles)

      return c.var.respond({
        data: {
          documentCount: articles.length,
          categories: facets.category,
          authors: facets.author,
          topTags: Object.entries(facets.tags)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count })),
          lastUpdated: new Date().toISOString(),
        },
      })
    })

    // Reindex endpoint (would trigger full reindex in production)
    app.post('/articles/reindex', async (c) => {
      // In production, this would:
      // 1. Clear the search index
      // 2. Fetch all articles from the database
      // 3. Re-index them with updated settings

      // For demo, we just reinitialize sample data
      searchIndex.clear()
      initializeSampleData()

      return c.var.respond({
        data: {
          success: true,
          documentCount: searchIndex.size,
          message: 'Search index rebuilt successfully',
          timestamp: new Date().toISOString(),
        },
      })
    })

    // Quick search endpoint (REST alternative to MCP tool)
    app.get('/articles/search', async (c) => {
      const query = c.req.query('q') || ''
      const limit = parseInt(c.req.query('limit') || '10', 10)
      const offset = parseInt(c.req.query('offset') || '0', 10)
      const category = c.req.query('category')
      const fuzzy = c.req.query('fuzzy') === 'true'

      if (!query) {
        return c.var.respond({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Query parameter "q" is required',
          },
        }, 400)
      }

      const startTime = performance.now()
      let results: Array<{ doc: Article; score: number }> = []

      for (const doc of searchIndex.values()) {
        if (category && doc.category !== category) continue

        let score = computeScore(doc, query)

        if (fuzzy && score === 0) {
          if (isFuzzyMatch(doc.title, query) || isFuzzyMatch(doc.content, query)) {
            score = 1
          }
        }

        if (score > 0) {
          results.push({ doc, score })
        }
      }

      results.sort((a, b) => b.score - a.score)
      const total = results.length
      results = results.slice(offset, offset + limit)

      const elapsed = performance.now() - startTime

      return c.var.respond({
        data: {
          hits: results.map(({ doc, score }) => ({
            id: doc.id,
            score,
            document: doc,
            highlights: {
              title: highlight(doc.title, query),
              content: highlight(doc.content.substring(0, 200), query) + '...',
            },
          })),
          total,
          elapsed: {
            raw: elapsed,
            formatted: `${elapsed.toFixed(2)}ms`,
          },
        },
        links: {
          self: c.req.url,
          next: offset + limit < total ? `${c.req.url}&offset=${offset + limit}` : null,
        },
      })
    })

    // Examples documentation
    app.get('/examples', (c) => {
      const url = new URL(c.req.url)
      return c.var.respond({
        data: [
          {
            name: 'Full-Text Search',
            description: 'Search articles with BM25 ranking',
            path: '/articles/search?q=search',
            methods: ['GET'],
          },
          {
            name: 'MCP Tools',
            description: 'JSON-RPC tools for search operations',
            path: '/mcp',
            methods: ['articles.create', 'articles.search', 'articles.suggest', 'articles.facets'],
          },
          {
            name: 'Test Discovery',
            description: 'Discover embedded tests via JSON-RPC',
            path: '/qa',
            methods: ['tests/list', 'examples/list', 'schemas/list'],
          },
          {
            name: 'Search Stats',
            description: 'Get search index statistics',
            path: '/articles/stats',
          },
          {
            name: 'Reindex',
            description: 'Rebuild the search index',
            path: '/articles/reindex',
            methods: ['POST'],
          },
        ],
        links: {
          self: `${url.origin}/examples`,
          health: `${url.origin}/health`,
          search: `${url.origin}/articles/search?q=search`,
          stats: `${url.origin}/articles/stats`,
          mcp: `${url.origin}/mcp`,
          qa: `${url.origin}/qa`,
          docs: 'https://github.com/dot-do/api',
        },
      })
    })
  },
})
