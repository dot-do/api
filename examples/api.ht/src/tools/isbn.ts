/**
 * isbn.api.ht/{isbn} — book lookup over Open Library (live), with offline
 * ISBN-10/13 checksum validation.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, notFoundValue, upstreamError } from '../registry'

const UA = 'api.ht/0.1 (hypertext API surface; +https://api.ht)'

export function validateIsbn(raw: string): { isbn: string; kind: 'ISBN-10' | 'ISBN-13' } | null {
  const isbn = raw.replace(/[\s-]/g, '').toUpperCase()
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const sum = isbn.split('').reduce((acc, ch, i) => acc + (ch === 'X' ? 10 : Number(ch)) * (10 - i), 0)
    return sum % 11 === 0 ? { isbn, kind: 'ISBN-10' } : null
  }
  if (/^\d{13}$/.test(isbn)) {
    const sum = isbn.split('').reduce((acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 1 : 3), 0)
    return sum % 10 === 0 ? { isbn, kind: 'ISBN-13' } : null
  }
  return null
}

interface OpenLibraryBook {
  title?: string
  publish_date?: string
  number_of_pages?: number
  publishers?: string[]
  authors?: { key: string }[]
  works?: { key: string }[]
  key?: string
}

export const isbnTool: HypertextTool = {
  name: 'isbn',
  description: 'Book lookup by ISBN — title, publisher, edition metadata (checksum-validated)',
  valueSyntax: '<isbn-10|isbn-13>',
  examples: ['9780140328721', '0140328726'],
  source: 'Open Library Books API (live); checksum validation offline',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const parsed = validateIsbn(value)
    if (!parsed) return badValue(`'${value}' is not a valid ISBN-10/13 (checksum or format failed)`)

    const url = `https://openlibrary.org/isbn/${parsed.isbn}.json`
    let book: OpenLibraryBook
    try {
      const res = await ctx.fetch(url, { headers: { accept: 'application/json', 'user-agent': UA }, redirect: 'follow' })
      if (res.status === 404) return notFoundValue(`No Open Library record for ISBN ${parsed.isbn}`)
      if (!res.ok) throw new Error(`Open Library returned ${res.status}`)
      book = (await res.json()) as OpenLibraryBook
    } catch (err) {
      return upstreamError(this.source, (err as Error).message)
    }

    const workKey = book.works?.[0]?.key
    return {
      data: {
        isbn: parsed.isbn,
        kind: parsed.kind,
        checksum: 'valid',
        title: book.title ?? null,
        publishDate: book.publish_date ?? null,
        pages: book.number_of_pages ?? null,
        publishers: book.publishers ?? [],
        openLibrary: book.key ? `https://openlibrary.org${book.key}` : url,
        work: workKey ? `https://openlibrary.org${workKey}` : null,
        cover: `https://covers.openlibrary.org/b/isbn/${parsed.isbn}-M.jpg`,
        source: this.source,
      },
      links: {
        openLibrary: book.key ? `https://openlibrary.org${book.key}` : url,
        work: workKey ? `https://openlibrary.org${workKey}` : undefined,
      },
    }
  },
}
