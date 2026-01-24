/**
 * Example: Service APIs
 *
 * Demonstrates all the non-CRUD API patterns:
 * - Service actions (send email)
 * - Proxy wrappers (Apollo.io)
 * - Package APIs (lodash)
 * - Mashups (company enrichment)
 * - Lookups (GeoNames, countries)
 * - Pipelines (data transformation)
 */

import { API } from '@dotdo/api'
import type { FunctionContext } from '@dotdo/api'

export default API({
  name: 'services-api',
  description: 'Service APIs: actions, proxies, packages, mashups, lookups',
  version: '1.0.0',

  functions: {
    // =========================================================================
    // SERVICE ACTIONS
    // =========================================================================

    functions: [
      // Send email via Resend
      {
        name: 'email.send',
        description: 'Send an email via Resend',
        input: {
          type: 'object',
          properties: {
            to: { type: 'string', format: 'email' },
            subject: { type: 'string' },
            body: { type: 'string' },
            from: { type: 'string', default: 'hello@example.com' },
          },
          required: ['to', 'subject', 'body'],
        },
        handler: async (input: { to: string; subject: string; body: string; from?: string }, ctx: FunctionContext) => {
          const RESEND_API_KEY = ctx.env.RESEND_API_KEY as string

          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: input.from || 'hello@example.com',
              to: input.to,
              subject: input.subject,
              html: input.body,
            }),
          })

          if (!response.ok) {
            throw new Error(`Failed to send email: ${response.statusText}`)
          }

          return response.json()
        },
        examples: [
          {
            name: 'basic',
            input: { to: 'user@example.com', subject: 'Hello', body: '<p>World</p>' },
          },
        ],
      },

      // Resize image
      {
        name: 'image.resize',
        description: 'Resize an image using Cloudflare Image Resizing',
        input: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
            width: { type: 'number' },
            height: { type: 'number' },
            fit: { type: 'string', enum: ['contain', 'cover', 'crop', 'scale-down'] },
          },
          required: ['url'],
        },
        handler: async (input: { url: string; width?: number; height?: number; fit?: string }) => {
          const params = new URLSearchParams()
          if (input.width) params.set('width', String(input.width))
          if (input.height) params.set('height', String(input.height))
          if (input.fit) params.set('fit', input.fit)

          return {
            url: `https://images.example.com/cdn-cgi/image/${params.toString()}/${encodeURIComponent(input.url)}`,
          }
        },
        cache: { ttl: 3600 },
      },

      // Generate short URL
      {
        name: 'url.shorten',
        description: 'Generate a short URL',
        input: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
            slug: { type: 'string' },
          },
          required: ['url'],
        },
        handler: async (input: { url: string; slug?: string }, ctx: FunctionContext) => {
          const slug = input.slug || Math.random().toString(36).slice(2, 8)
          const kv = ctx.env.URLS as KVNamespace

          await kv.put(slug, input.url)

          return {
            shortUrl: `https://short.example.com/${slug}`,
            slug,
            originalUrl: input.url,
          }
        },
      },
    ],

    // =========================================================================
    // PROXY WRAPPERS
    // =========================================================================

    proxies: [
      // Apollo.io - Sales intelligence
      {
        name: 'apollo',
        description: 'Apollo.io API wrapper with caching and transformation',
        upstream: 'https://api.apollo.io/v1',
        auth: {
          type: 'api-key',
          header: 'X-Api-Key',
          tokenVar: 'APOLLO_API_KEY',
        },
        transformResponse: (res) => {
          // Flatten Apollo's nested response
          const body = res.body as { data?: unknown }
          return body.data || body
        },
        cache: { ttl: 3600 },
        endpoints: [
          { path: '/people/search', methods: ['POST'] },
          { path: '/organizations/search', methods: ['POST'] },
          { path: '/people/:id', methods: ['GET'] },
          { path: '/organizations/:id', methods: ['GET'] },
        ],
      },

      // OpenAI - AI completions
      {
        name: 'openai',
        description: 'OpenAI API wrapper',
        upstream: 'https://api.openai.com/v1',
        auth: {
          type: 'bearer',
          tokenVar: 'OPENAI_API_KEY',
        },
        addHeaders: {
          'Content-Type': 'application/json',
        },
      },

      // Stripe - Payments (read-only)
      {
        name: 'stripe',
        description: 'Stripe API wrapper for reading data',
        upstream: 'https://api.stripe.com/v1',
        auth: {
          type: 'bearer',
          tokenVar: 'STRIPE_SECRET_KEY',
        },
        transformResponse: (res) => {
          const body = res.body as { data?: unknown }
          return body.data || body
        },
        cache: { ttl: 60 }, // Short cache for payment data
      },
    ],

    // =========================================================================
    // PACKAGE APIs
    // =========================================================================

    packages: [
      // Lodash - Utility functions
      {
        name: 'lodash',
        module: 'lodash-es',
        description: 'Lodash utility functions as API',
        namespace: 'lodash',
        expose: [
          { name: 'groupBy', description: 'Group array by key' },
          { name: 'sortBy', description: 'Sort array by key(s)' },
          { name: 'chunk', description: 'Split array into chunks' },
          { name: 'uniq', description: 'Get unique values' },
          { name: 'pick', description: 'Pick object properties' },
          { name: 'omit', description: 'Omit object properties' },
          { name: 'merge', description: 'Deep merge objects' },
          { name: 'get', description: 'Get nested property' },
          { name: 'set', description: 'Set nested property' },
        ],
      },

      // Date-fns - Date utilities
      {
        name: 'date-fns',
        description: 'Date manipulation functions',
        namespace: 'date',
        expose: [
          { name: 'format', description: 'Format date' },
          { name: 'parse', description: 'Parse date string' },
          { name: 'addDays', description: 'Add days to date' },
          { name: 'differenceInDays', description: 'Get difference in days' },
        ],
      },
    ],

    // =========================================================================
    // MASHUPS
    // =========================================================================

    mashups: [
      // Company enrichment - combine WHOIS, DNS, and company data
      {
        name: 'company.enrich',
        description: 'Enrich company data from multiple sources',
        input: {
          type: 'object',
          properties: {
            domain: { type: 'string' },
          },
          required: ['domain'],
        },
        sources: {
          whois: {
            url: 'https://whois.do/{domain}',
            transform: (data: unknown) => {
              const d = data as { data?: { registrant?: unknown; dates?: unknown } }
              return {
                registrant: d.data?.registrant,
                dates: d.data?.dates,
              }
            },
          },
          dns: {
            url: 'https://dns.do/{domain}/records',
            transform: (data: unknown) => {
              const d = data as { data?: unknown[] }
              return d.data || []
            },
            required: false, // Don't fail if DNS lookup fails
          },
          ssl: {
            url: 'https://ssl.do/{domain}',
            transform: (data: unknown) => {
              const d = data as { data?: { issuer?: string; validTo?: string } }
              return {
                issuer: d.data?.issuer,
                validTo: d.data?.validTo,
              }
            },
            required: false,
          },
        },
        merge: (results, input) => {
          const domain = (input as { domain: string }).domain
          return {
            domain,
            whois: results.whois,
            dns: results.dns,
            ssl: results.ssl,
            enrichedAt: new Date().toISOString(),
          }
        },
        cache: { ttl: 86400 }, // Cache for 24 hours
      },

      // Full contact enrichment
      {
        name: 'contact.enrich',
        description: 'Enrich contact with social profiles and company data',
        input: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
          },
          required: ['email'],
        },
        sources: {
          gravatar: {
            url: 'https://www.gravatar.com/{emailHash}.json',
            params: {
              emailHash: 'email', // Will be hashed by the handler
            },
            required: false,
          },
          clearbit: {
            url: 'https://person.clearbit.com/v2/people/find?email={email}',
            headers: {
              Authorization: 'Bearer ${CLEARBIT_API_KEY}',
            },
            required: false,
          },
        },
        merge: 'deep',
        cache: { ttl: 86400 },
      },
    ],

    // =========================================================================
    // LOOKUPS
    // =========================================================================

    lookups: [
      // Countries lookup
      {
        name: 'countries',
        description: 'Country reference data',
        source: {
          type: 'static',
          data: [
            { code: 'US', name: 'United States', region: 'Americas', currency: 'USD' },
            { code: 'GB', name: 'United Kingdom', region: 'Europe', currency: 'GBP' },
            { code: 'DE', name: 'Germany', region: 'Europe', currency: 'EUR' },
            { code: 'FR', name: 'France', region: 'Europe', currency: 'EUR' },
            { code: 'JP', name: 'Japan', region: 'Asia', currency: 'JPY' },
            // ... more countries
          ],
        },
        primaryKey: 'code',
        fields: [
          { name: 'code', type: 'string', indexed: true },
          { name: 'name', type: 'string', indexed: true },
          { name: 'region', type: 'string', indexed: true },
          { name: 'currency', type: 'string' },
        ],
        search: {
          fields: ['code', 'name'],
          minLength: 1,
        },
        autocomplete: {
          field: 'name',
          include: ['code'],
          limit: 10,
        },
        cache: { ttl: 86400 * 30 }, // Cache for 30 days
      },

      // Timezones lookup
      {
        name: 'timezones',
        description: 'Timezone reference data',
        source: {
          type: 'database',
          binding: 'DB',
          name: 'timezones',
        },
        primaryKey: 'id',
        fields: [
          { name: 'id', type: 'string', indexed: true },
          { name: 'name', type: 'string', indexed: true },
          { name: 'offset', type: 'number' },
          { name: 'abbreviation', type: 'string' },
        ],
        search: {
          fields: ['id', 'name', 'abbreviation'],
          fullText: true,
        },
        cache: { ttl: 86400 },
      },

      // Industry codes (NAICS)
      {
        name: 'naics',
        description: 'NAICS industry classification codes',
        source: {
          type: 'kv',
          binding: 'REFERENCE_DATA',
          name: 'naics',
        },
        primaryKey: 'code',
        fields: [
          { name: 'code', type: 'string', indexed: true },
          { name: 'title', type: 'string', indexed: true },
          { name: 'description', type: 'string' },
          { name: 'sector', type: 'string', indexed: true },
        ],
        search: {
          fields: ['code', 'title', 'description'],
          fullText: true,
          limit: 50,
        },
        autocomplete: {
          field: 'title',
          include: ['code'],
          limit: 10,
          minLength: 2,
        },
        cache: { ttl: 86400 * 7 },
      },
    ],

    // =========================================================================
    // PIPELINES
    // =========================================================================

    pipelines: [
      // Lead scoring pipeline
      {
        name: 'lead.score',
        description: 'Score a lead based on enrichment data',
        input: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            company: { type: 'string' },
          },
          required: ['email'],
        },
        steps: [
          // Step 1: Enrich the contact
          {
            name: 'enrich',
            type: 'function',
            function: 'contact.enrich',
          },
          // Step 2: Calculate score
          {
            name: 'score',
            type: 'transform',
            transform: (data: unknown) => {
              const d = data as { gravatar?: unknown; clearbit?: { company?: { employees?: number } } }
              let score = 0

              // Has gravatar profile
              if (d.gravatar) score += 10

              // Has Clearbit data
              if (d.clearbit) {
                score += 20
                // Company size bonus
                const employees = d.clearbit.company?.employees || 0
                if (employees > 1000) score += 30
                else if (employees > 100) score += 20
                else if (employees > 10) score += 10
              }

              return { ...d, score, scoredAt: new Date().toISOString() }
            },
          },
          // Step 3: Categorize
          {
            name: 'categorize',
            type: 'condition',
            condition: {
              if: (data: unknown) => (data as { score: number }).score >= 50,
              then: [
                {
                  name: 'high-value',
                  type: 'transform',
                  transform: (data: unknown) => ({ ...data as object, tier: 'high' }),
                },
              ],
              else: [
                {
                  name: 'low-value',
                  type: 'transform',
                  transform: (data: unknown) => ({ ...data as object, tier: 'low' }),
                },
              ],
            },
          },
        ],
        cache: { ttl: 3600 },
      },
    ],

    // Global settings
    cache: 'CACHE', // KV binding for caching
    basePath: '', // Mount at root
    mcp: true, // Generate MCP tools
  },
})

/*
Usage Examples:

# Service Actions
POST /email/send
{ "to": "user@example.com", "subject": "Hello", "body": "<p>World</p>" }

POST /image/resize
{ "url": "https://example.com/image.jpg", "width": 800 }

# Proxy APIs
POST /apollo/people/search
{ "person_titles": ["CEO"], "organization_domains": ["example.com"] }

POST /openai/chat/completions
{ "model": "gpt-4", "messages": [{"role": "user", "content": "Hello"}] }

# Package APIs
POST /lodash/groupBy
{ "args": [[{"a": 1}, {"a": 2}, {"a": 1}], "a"] }

POST /lodash/chunk
{ "args": [[1, 2, 3, 4, 5], 2] }

# Mashups
GET /company/enrich?domain=example.com
POST /contact/enrich
{ "email": "user@example.com" }

# Lookups
GET /countries
GET /countries/US
GET /countries/search?q=united
GET /countries/autocomplete?q=uni

GET /timezones/America/New_York
GET /timezones/search?q=eastern

# Pipelines
POST /lead/score
{ "email": "ceo@bigcorp.com", "company": "Big Corp" }

# MCP Tools
POST /mcp
{ "jsonrpc": "2.0", "method": "tools/list", "id": 1 }

POST /mcp
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": { "name": "email.send", "arguments": {...} },
  "id": 2
}
*/
