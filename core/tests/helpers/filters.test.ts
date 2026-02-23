import { describe, it, expect } from 'vitest'
import { parseFilters, canonicalizeFilter, parseSort, canonicalizeSort } from '../../src/helpers/filters'

describe('Filter helpers', () => {
  // Helper to create URLSearchParams from a query string
  const params = (query: string) => new URLSearchParams(query)

  describe('parseFilters — symbolic syntax', () => {
    it('parses simple equality (no operator)', () => {
      const result = parseFilters(params('status=Active'))
      expect(result.filter).toEqual({ status: { $eq: 'Active' } })
    })

    it('parses comma-separated values as $in', () => {
      const result = parseFilters(params('status=Active,Qualified'))
      expect(result.filter).toEqual({ status: { $in: ['Active', 'Qualified'] } })
    })

    it('parses != as $ne', () => {
      const result = parseFilters(params('status!=Churned'))
      expect(result.filter).toEqual({ status: { $ne: 'Churned' } })
    })

    it('parses > as $gt', () => {
      const result = parseFilters(params('amount>10000'))
      expect(result.filter).toEqual({ amount: { $gt: 10000 } })
    })

    it('parses >= as $gte', () => {
      const result = parseFilters(params('amount>=10000'))
      expect(result.filter).toEqual({ amount: { $gte: 10000 } })
    })

    it('parses < as $lt', () => {
      const result = parseFilters(params('amount<50000'))
      expect(result.filter).toEqual({ amount: { $lt: 50000 } })
    })

    it('parses <= as $lte', () => {
      const result = parseFilters(params('amount<=50000'))
      expect(result.filter).toEqual({ amount: { $lte: 50000 } })
    })

    it('parses ~ as $regex', () => {
      const result = parseFilters(params('name~alice'))
      expect(result.filter).toEqual({ name: { $regex: 'alice' } })
    })

    it('handles multiple symbolic filters together', () => {
      const result = parseFilters(params('status=Active&amount>10000&name~alice'))
      expect(result.filter).toEqual({
        status: { $eq: 'Active' },
        amount: { $gt: 10000 },
        name: { $regex: 'alice' },
      })
    })
  })

  describe('parseFilters — dot-suffix syntax', () => {
    it('parses .eq', () => {
      const result = parseFilters(params('status.eq=Active'))
      expect(result.filter).toEqual({ status: { $eq: 'Active' } })
    })

    it('parses .in with comma-separated values', () => {
      const result = parseFilters(params('status.in=Active,Qualified'))
      expect(result.filter).toEqual({ status: { $in: ['Active', 'Qualified'] } })
    })

    it('parses .not as $ne', () => {
      const result = parseFilters(params('status.not=Churned'))
      expect(result.filter).toEqual({ status: { $ne: 'Churned' } })
    })

    it('parses .gt', () => {
      const result = parseFilters(params('amount.gt=10000'))
      expect(result.filter).toEqual({ amount: { $gt: 10000 } })
    })

    it('parses .gte', () => {
      const result = parseFilters(params('amount.gte=10000'))
      expect(result.filter).toEqual({ amount: { $gte: 10000 } })
    })

    it('parses .lt', () => {
      const result = parseFilters(params('amount.lt=50000'))
      expect(result.filter).toEqual({ amount: { $lt: 50000 } })
    })

    it('parses .lte', () => {
      const result = parseFilters(params('amount.lte=50000'))
      expect(result.filter).toEqual({ amount: { $lte: 50000 } })
    })

    it('parses .contains as $regex', () => {
      const result = parseFilters(params('name.contains=alice'))
      expect(result.filter).toEqual({ name: { $regex: 'alice' } })
    })

    it('parses .starts as $regex with ^ anchor', () => {
      const result = parseFilters(params('name.starts=Al'))
      expect(result.filter).toEqual({ name: { $regex: '^Al' } })
    })

    it('parses .ends as $regex with $ anchor and escapes special chars', () => {
      const result = parseFilters(params('name.ends=@acme.com'))
      expect(result.filter).toEqual({ name: { $regex: '@acme\\.com$' } })
    })

    it('parses .exists=true', () => {
      const result = parseFilters(params('email.exists=true'))
      expect(result.filter).toEqual({ email: { $exists: true } })
    })

    it('parses .exists=false', () => {
      const result = parseFilters(params('email.exists=false'))
      expect(result.filter).toEqual({ email: { $exists: false } })
    })

    it('parses .between as $gte + $lte', () => {
      const result = parseFilters(params('amount.between=10000,50000'))
      expect(result.filter).toEqual({ amount: { $gte: 10000, $lte: 50000 } })
    })

    it('parses .nin as $nin', () => {
      const result = parseFilters(params('status.nin=Churned,Frozen'))
      expect(result.filter).toEqual({ status: { $nin: ['Churned', 'Frozen'] } })
    })

    it('handles multiple dot-suffix filters together', () => {
      const result = parseFilters(params('status.eq=Active&amount.gt=10000&name.contains=alice'))
      expect(result.filter).toEqual({
        status: { $eq: 'Active' },
        amount: { $gt: 10000 },
        name: { $regex: 'alice' },
      })
    })
  })

  describe('parseFilters — mixed syntax', () => {
    it('handles symbolic and dot-suffix in the same query', () => {
      const result = parseFilters(params('status=Active&amount.gt=10000&name~alice'))
      expect(result.filter).toEqual({
        status: { $eq: 'Active' },
        amount: { $gt: 10000 },
        name: { $regex: 'alice' },
      })
    })
  })

  describe('parseFilters — numeric value detection', () => {
    it('detects integer values', () => {
      const result = parseFilters(params('amount>10000'))
      expect(result.filter.amount.$gt).toBe(10000)
      expect(typeof result.filter.amount.$gt).toBe('number')
    })

    it('detects float values', () => {
      const result = parseFilters(params('price.gt=99.99'))
      expect(result.filter.price.$gt).toBe(99.99)
      expect(typeof result.filter.price.$gt).toBe('number')
    })

    it('detects negative numbers', () => {
      const result = parseFilters(params('balance.lt=-100'))
      expect(result.filter.balance.$lt).toBe(-100)
      expect(typeof result.filter.balance.$lt).toBe('number')
    })

    it('does not coerce non-numeric strings to numbers', () => {
      const result = parseFilters(params('name=alice'))
      expect(result.filter.name.$eq).toBe('alice')
      expect(typeof result.filter.name.$eq).toBe('string')
    })

    it('does not coerce partial numeric strings', () => {
      const result = parseFilters(params('code=123abc'))
      expect(result.filter.code.$eq).toBe('123abc')
      expect(typeof result.filter.code.$eq).toBe('string')
    })

    it('detects numeric values in comma-separated lists', () => {
      const result = parseFilters(params('amount.in=100,200,300'))
      expect(result.filter.amount.$in).toEqual([100, 200, 300])
      result.filter.amount.$in.forEach((v: number) => expect(typeof v).toBe('number'))
    })

    it('keeps mixed comma-separated lists as strings when not all numeric', () => {
      const result = parseFilters(params('tag.in=100,alpha,300'))
      expect(result.filter.tag.$in).toEqual(['100', 'alpha', '300'])
    })

    it('detects numeric values in between', () => {
      const result = parseFilters(params('amount.between=10000,50000'))
      expect(result.filter.amount.$gte).toBe(10000)
      expect(result.filter.amount.$lte).toBe(50000)
    })
  })

  describe('parseFilters — reserved params', () => {
    it('ignores all reserved params', () => {
      const reserved = 'page=1&limit=10&after=abc&before=def&array=true&raw=true&debug=true&domains=a.com&count=true&distinct=name&stream=true&format=json&depth=2&include=tags&fields=name,email&exclude=password&sort=-createdAt&q=search+term'
      const result = parseFilters(params(reserved))
      expect(result.filter).toEqual({})
    })

    it('parses filters while ignoring reserved params', () => {
      const result = parseFilters(params('status=Active&page=1&limit=10&sort=-createdAt'))
      expect(result.filter).toEqual({ status: { $eq: 'Active' } })
    })

    it('extracts fields from the fields param', () => {
      const result = parseFilters(params('fields=name,email,status'))
      expect(result.fields).toEqual(['name', 'email', 'status'])
    })

    it('extracts exclude from the exclude param', () => {
      const result = parseFilters(params('exclude=password,secret'))
      expect(result.exclude).toEqual(['password', 'secret'])
    })
  })

  describe('parseFilters — sort extraction', () => {
    it('extracts sort from the sort param', () => {
      const result = parseFilters(params('sort=-createdAt'))
      expect(result.sort).toEqual({ createdAt: -1 })
    })

    it('extracts multi-field sort', () => {
      const result = parseFilters(params('sort=-createdAt,name'))
      expect(result.sort).toEqual({ createdAt: -1, name: 1 })
    })

    it('returns empty sort when no sort param', () => {
      const result = parseFilters(params('status=Active'))
      expect(result.sort).toEqual({})
    })
  })

  describe('parseSort', () => {
    it('parses ascending sort (no prefix)', () => {
      expect(parseSort('name')).toEqual({ name: 1 })
    })

    it('parses descending sort (- prefix)', () => {
      expect(parseSort('-name')).toEqual({ name: -1 })
    })

    it('parses multi-field sort', () => {
      expect(parseSort('-createdAt,name')).toEqual({ createdAt: -1, name: 1 })
    })

    it('parses dot-suffix asc', () => {
      expect(parseSort('name.asc')).toEqual({ name: 1 })
    })

    it('parses dot-suffix desc', () => {
      expect(parseSort('name.desc')).toEqual({ name: -1 })
    })

    it('parses mixed prefix and dot-suffix sort', () => {
      expect(parseSort('-createdAt,name.asc,amount.desc')).toEqual({
        createdAt: -1,
        name: 1,
        amount: -1,
      })
    })

    it('returns empty object for empty string', () => {
      expect(parseSort('')).toEqual({})
    })
  })

  describe('canonicalizeFilter', () => {
    it('converts $eq to dot-suffix', () => {
      const result = canonicalizeFilter({ status: { $eq: 'Active' } })
      expect(result).toBe('status.eq=Active')
    })

    it('converts $in to dot-suffix with comma-separated values', () => {
      const result = canonicalizeFilter({ status: { $in: ['Active', 'Qualified'] } })
      expect(result).toBe('status.in=Active%2CQualified')
    })

    it('converts $ne to .not', () => {
      const result = canonicalizeFilter({ status: { $ne: 'Churned' } })
      expect(result).toBe('status.not=Churned')
    })

    it('converts $gt to .gt', () => {
      const result = canonicalizeFilter({ amount: { $gt: 10000 } })
      expect(result).toBe('amount.gt=10000')
    })

    it('converts $gte to .gte', () => {
      const result = canonicalizeFilter({ amount: { $gte: 10000 } })
      expect(result).toBe('amount.gte=10000')
    })

    it('converts $lt to .lt', () => {
      const result = canonicalizeFilter({ amount: { $lt: 50000 } })
      expect(result).toBe('amount.lt=50000')
    })

    it('converts $lte to .lte', () => {
      const result = canonicalizeFilter({ amount: { $lte: 50000 } })
      expect(result).toBe('amount.lte=50000')
    })

    it('converts $regex to .contains', () => {
      const result = canonicalizeFilter({ name: { $regex: 'alice' } })
      expect(result).toBe('name.contains=alice')
    })

    it('converts $regex with ^ anchor to .starts', () => {
      const result = canonicalizeFilter({ name: { $regex: '^Al' } })
      expect(result).toBe('name.starts=Al')
    })

    it('converts $regex with $ anchor to .ends', () => {
      const result = canonicalizeFilter({ name: { $regex: 'com$' } })
      expect(result).toBe('name.ends=com')
    })

    it('converts $exists to .exists', () => {
      const result = canonicalizeFilter({ email: { $exists: true } })
      expect(result).toBe('email.exists=true')
    })

    it('converts $nin to .nin', () => {
      const result = canonicalizeFilter({ status: { $nin: ['Churned', 'Frozen'] } })
      expect(result).toBe('status.nin=Churned%2CFrozen')
    })

    it('converts $gte + $lte on same field to .between', () => {
      const result = canonicalizeFilter({ amount: { $gte: 10000, $lte: 50000 } })
      expect(result).toBe('amount.between=10000%2C50000')
    })

    it('handles multiple fields sorted alphabetically', () => {
      const result = canonicalizeFilter({
        amount: { $gt: 10000 },
        status: { $eq: 'Active' },
        name: { $regex: 'alice' },
      })
      expect(result).toBe('amount.gt=10000&name.contains=alice&status.eq=Active')
    })

    it('returns empty string for empty filter', () => {
      const result = canonicalizeFilter({})
      expect(result).toBe('')
    })
  })

  describe('canonicalizeSort', () => {
    it('converts ascending sort', () => {
      expect(canonicalizeSort({ name: 1 })).toBe('name.asc')
    })

    it('converts descending sort', () => {
      expect(canonicalizeSort({ name: -1 })).toBe('name.desc')
    })

    it('converts multi-field sort', () => {
      expect(canonicalizeSort({ createdAt: -1, name: 1 })).toBe('createdAt.desc,name.asc')
    })

    it('returns empty string for empty sort', () => {
      expect(canonicalizeSort({})).toBe('')
    })
  })

  describe('round-trip canonicalization', () => {
    it('symbolic → filter → canonical → filter produces same result', () => {
      const original = parseFilters(params('status=Active&amount>10000'))
      const canonical = canonicalizeFilter(original.filter)
      const roundTrip = parseFilters(params(canonical))
      expect(roundTrip.filter).toEqual(original.filter)
    })

    it('dot-suffix → filter → canonical → filter produces same result', () => {
      const original = parseFilters(params('status.eq=Active&amount.gt=10000&name.contains=alice'))
      const canonical = canonicalizeFilter(original.filter)
      const roundTrip = parseFilters(params(canonical))
      expect(roundTrip.filter).toEqual(original.filter)
    })

    it('between round-trips correctly', () => {
      const original = parseFilters(params('amount.between=10000,50000'))
      const canonical = canonicalizeFilter(original.filter)
      const roundTrip = parseFilters(params(canonical))
      expect(roundTrip.filter).toEqual(original.filter)
    })

    it('sort round-trips correctly', () => {
      const original = parseSort('-createdAt,name')
      const canonical = canonicalizeSort(original)
      const roundTrip = parseSort(canonical)
      expect(roundTrip).toEqual(original)
    })
  })

  describe('edge cases', () => {
    it('handles empty URLSearchParams', () => {
      const result = parseFilters(params(''))
      expect(result.filter).toEqual({})
      expect(result.sort).toEqual({})
    })

    it('handles empty value for a key', () => {
      const result = parseFilters(params('status='))
      // empty value should not produce a filter
      expect(result.filter).toEqual({})
    })

    it('handles boolean-like string values', () => {
      const result = parseFilters(params('active=true'))
      expect(result.filter).toEqual({ active: { $eq: true } })
    })

    it('handles boolean false string', () => {
      const result = parseFilters(params('active=false'))
      expect(result.filter).toEqual({ active: { $eq: false } })
    })

    it('handles special characters in regex values', () => {
      const result = parseFilters(params('email.ends=@acme.com'))
      // dots in the value should be escaped in the resulting regex
      expect(result.filter.email.$regex).toBe('@acme\\.com$')
    })

    it('handles URL-encoded values', () => {
      const result = parseFilters(params('name=hello%20world'))
      expect(result.filter).toEqual({ name: { $eq: 'hello world' } })
    })

    it('handles zero as a numeric value', () => {
      const result = parseFilters(params('amount.eq=0'))
      expect(result.filter).toEqual({ amount: { $eq: 0 } })
      expect(typeof result.filter.amount.$eq).toBe('number')
    })

    it('does not treat only-reserved params as filters', () => {
      const result = parseFilters(params('sort=name&limit=10'))
      expect(result.filter).toEqual({})
      expect(result.sort).toEqual({ name: 1 })
    })

    it('handles fields with no value for fields/exclude', () => {
      const result = parseFilters(params('fields=&exclude='))
      expect(result.fields).toBeUndefined()
      expect(result.exclude).toBeUndefined()
    })
  })
})
