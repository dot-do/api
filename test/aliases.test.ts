import { describe, it, expect } from 'vitest'
import { resolve, ALIASES } from '../src/aliases'

describe('Alias Resolution', () => {
  it('resolves abbreviations to canonical names', () => {
    expect(resolve('db')).toBe('database')
    expect(resolve('fn')).toBe('functions')
    expect(resolve('event')).toBe('events')
  })

  it('passes through canonical names unchanged', () => {
    expect(resolve('database')).toBe('database')
    expect(resolve('functions')).toBe('functions')
    expect(resolve('events')).toBe('events')
  })

  it('returns the input if no alias exists', () => {
    expect(resolve('unknown-thing')).toBe('unknown-thing')
  })

  it('resolves singular to plural', () => {
    expect(resolve('workflow')).toBe('workflows')
    expect(resolve('agent')).toBe('agents')
    expect(resolve('goal')).toBe('goals')
    expect(resolve('task')).toBe('tasks')
    expect(resolve('project')).toBe('projects')
    expect(resolve('experiment')).toBe('experiments')
  })
})
