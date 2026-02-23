import type { Links } from '../types'

export interface PaginationParams {
  url: URL
  total: number
  limit: number
  offset: number
}

export interface PaginationResult {
  links: Links
  total: number
  limit: number
  page: number
  hasNext: boolean
  hasPrev: boolean
}

export function buildPagination({ url, total, limit, offset }: PaginationParams): PaginationResult {
  const base = `${url.protocol}//${url.host}${url.pathname}`
  const params = new URLSearchParams(url.search)

  const page = Math.floor(offset / limit) + 1
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const hasNext = offset + limit < total
  const hasPrev = offset > 0

  const buildUrl = (newOffset: number) => {
    const p = new URLSearchParams(params)
    p.set('offset', String(newOffset))
    p.set('limit', String(limit))
    return `${base}?${p.toString()}`
  }

  const links: Links = {
    self: url.toString(),
    first: buildUrl(0),
    last: buildUrl(Math.max(0, (totalPages - 1) * limit)),
  }

  // Only include prev/next when applicable
  if (hasNext) {
    links.next = buildUrl(offset + limit)
  }

  if (hasPrev) {
    links.prev = buildUrl(Math.max(0, offset - limit))
  }

  return { links, total, limit, page, hasNext, hasPrev }
}

export interface PagePaginationParams {
  url: URL
  total: number
  limit: number
  page: number
}

export interface PagePaginationResult {
  links: Links
  total: number
  limit: number
  page: number
  hasNext: boolean
  hasPrev: boolean
}

export function buildPagePagination({ url, total, limit, page }: PagePaginationParams): PagePaginationResult {
  const base = `${url.protocol}//${url.host}${url.pathname}`
  const params = new URLSearchParams(url.search)

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const currentPage = Math.max(1, Math.min(page, totalPages))
  const hasNext = currentPage < totalPages
  const hasPrev = currentPage > 1

  const buildUrl = (p: number) => {
    const sp = new URLSearchParams(params)
    sp.set('page', String(p))
    sp.set('limit', String(limit))
    return `${base}?${sp.toString()}`
  }

  const links: Links = {
    self: url.toString(),
    first: buildUrl(1),
    last: buildUrl(totalPages),
  }

  if (hasNext) {
    links.next = buildUrl(currentPage + 1)
  }

  if (hasPrev) {
    links.prev = buildUrl(currentPage - 1)
  }

  return { links, total, limit, page: currentPage, hasNext, hasPrev }
}

export interface CursorPaginationParams {
  url: URL
  cursor?: string
  limit: number
  hasMore: boolean
  nextCursor?: string
  prevCursor?: string
}

export interface CursorPaginationResult {
  links: Links
  limit: number
}

export function buildCursorPagination({ url, limit, hasMore, nextCursor, prevCursor }: CursorPaginationParams): CursorPaginationResult {
  const base = `${url.protocol}//${url.host}${url.pathname}`
  const params = new URLSearchParams(url.search)

  const links: Links = {
    self: url.toString(),
  }

  if (hasMore && nextCursor) {
    const p = new URLSearchParams(params)
    p.set('after', nextCursor)
    p.set('limit', String(limit))
    p.delete('before')
    links.next = `${base}?${p.toString()}`
  }

  if (prevCursor) {
    const p = new URLSearchParams(params)
    p.set('before', prevCursor)
    p.set('limit', String(limit))
    p.delete('after')
    links.prev = `${base}?${p.toString()}`
  }

  return { links, limit }
}
