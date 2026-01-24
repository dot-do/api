import type { Links } from '../types'

export interface PaginationParams {
  url: URL
  total: number
  limit: number
  offset: number
}

export interface PaginationResult {
  links: Links
  hasNext: boolean
  hasPrev: boolean
}

export function buildPagination({ url, total, limit, offset }: PaginationParams): PaginationResult {
  const base = `${url.protocol}//${url.host}${url.pathname}`
  const params = new URLSearchParams(url.search)
  const hasNext = offset + limit < total
  const hasPrev = offset > 0

  const buildUrl = (newOffset: number) => {
    params.set('offset', String(newOffset))
    params.set('limit', String(limit))
    return `${base}?${params.toString()}`
  }

  const links: Links = {
    self: url.toString(),
    first: buildUrl(0),
    last: buildUrl(Math.max(0, Math.floor((total - 1) / limit) * limit)),
  }

  if (hasNext) {
    links.next = buildUrl(offset + limit)
  }

  if (hasPrev) {
    links.prev = buildUrl(Math.max(0, offset - limit))
  }

  return { links, hasNext, hasPrev }
}

export interface CursorPaginationParams {
  url: URL
  cursor?: string
  limit: number
  hasMore: boolean
  nextCursor?: string
}

export function buildCursorPagination({ url, limit, hasMore, nextCursor }: CursorPaginationParams): Links {
  const base = `${url.protocol}//${url.host}${url.pathname}`
  const params = new URLSearchParams(url.search)

  const links: Links = {
    self: url.toString(),
  }

  if (hasMore && nextCursor) {
    params.set('cursor', nextCursor)
    params.set('limit', String(limit))
    links.next = `${base}?${params.toString()}`
  }

  return links
}
