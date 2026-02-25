import { describe, it, expect } from 'vitest'
import { buildNavigator } from '../src/primitives'

describe('Primitives Navigator', () => {
  it('builds navigator with .do domain URLs by default', () => {
    const nav = buildNavigator('https://apis.do', false)
    expect(nav.core.Noun).toBe('https://nouns.do')
    expect(nav.core.Event).toBe('https://events.do')
    expect(nav.intelligence.Database).toBe('https://database.do')
    expect(nav.execution.Workflow).toBe('https://workflows.do')
    expect(nav.actors.Agent).toBe('https://agents.do')
    expect(nav.outputs.Service).toBe('https://services.do')
    expect(nav.interfaces.SDK).toBe('https://sdk.do')
  })

  it('builds navigator with local paths when useLocal=true', () => {
    const nav = buildNavigator('https://apis.do', true)
    expect(nav.core.Noun).toBe('https://apis.do/nouns')
    expect(nav.core.Event).toBe('https://apis.do/events')
    expect(nav.intelligence.Database).toBe('https://apis.do/database')
    expect(nav.execution.Workflow).toBe('https://apis.do/workflows')
    expect(nav.actors.Agent).toBe('https://apis.do/agents')
    expect(nav.outputs.Service).toBe('https://apis.do/services')
    expect(nav.interfaces.SDK).toBe('https://apis.do/sdk')
  })

  it('always uses apis.do paths for items without .do domains', () => {
    const nav = buildNavigator('https://apis.do', false)
    expect(nav.core.Domain).toBe('https://apis.do/domains')
    expect(nav.execution.Tool).toBe('https://apis.do/tools')
  })

  it('includes all 7 categories in the correct order', () => {
    const nav = buildNavigator('https://apis.do', false)
    const keys = Object.keys(nav)
    expect(keys).toEqual(['core', 'intelligence', 'execution', 'actors', 'outputs', 'interfaces', 'lifecycle'])
  })

  it('Domain is first item in core', () => {
    const nav = buildNavigator('https://apis.do', false)
    const coreKeys = Object.keys(nav.core)
    expect(coreKeys[0]).toBe('Domain')
  })
})
