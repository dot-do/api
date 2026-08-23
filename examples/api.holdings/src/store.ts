/**
 * store.ts — the sandbox workspace: the §5.2 seed corpus (tenant #1, the
 * live-demo ruling — same handlers as product) plus an EPHEMERAL in-memory
 * anonymous workspace for writes (per-isolate, disclosed retention, never
 * persisted). One service layer — the REST routes and the MCP tools both
 * call these functions: one definition, two transports.
 */

import {
  BOI_REPORTS,
  ENTITIES,
  FORMATIONS,
  OWNERSHIP_STAKES,
  REGISTERED_AGENTS,
  REGISTRATIONS,
  RENEWALS,
  RETENTION_NOTE,
  type SeedEntity,
} from './seed'

export interface Workspace {
  extraEntities: SeedEntity[]
}

export function createWorkspace(): Workspace {
  return { extraEntities: [] }
}

export const listRenewals = () => RENEWALS
export const getRenewal = (id: string) => RENEWALS.find((r) => r.id === id)
export const listFormations = () => FORMATIONS
export const getFormation = (id: string) => FORMATIONS.find((f) => f.id === id)
export const listRegistrations = () => REGISTRATIONS
export const getRegistration = (id: string) => REGISTRATIONS.find((r) => r.id === id)
export const listBOIReports = () => BOI_REPORTS
export const listRegisteredAgents = () => REGISTERED_AGENTS
export const listOwnershipStakes = () => OWNERSHIP_STAKES

export function listEntities(ws: Workspace): SeedEntity[] {
  return [...ENTITIES, ...ws.extraEntities]
}

export function getEntity(ws: Workspace, id: string): SeedEntity | undefined {
  return listEntities(ws).find((e) => e.id === id)
}

/** The unified entity record: the entity plus every typed record that hangs off it. */
export function getEntityUnified(ws: Workspace, id: string) {
  const entity = getEntity(ws, id)
  if (!entity) return undefined
  return {
    ...entity,
    formation: FORMATIONS.find((f) => f.entityId === id),
    registrations: REGISTRATIONS.filter((r) => r.entityId === id),
    boiReport: BOI_REPORTS.find((b) => b.entityId === id),
    registeredAgent: REGISTERED_AGENTS.find((a) => a.id === entity.registeredAgentId),
    renewals: RENEWALS.filter((r) => r.entityId === id),
    ownership: OWNERSHIP_STAKES.filter((o) => o.entityId === id || o.parentId === id),
  }
}

const JURISDICTIONS = ['DE', 'TX'] as const

export interface CreateEntityInput {
  name?: string
  jurisdiction?: string
  entityType?: string
  parentId?: string
}

export function createEntity(ws: Workspace, input: CreateEntityInput): { entity?: SeedEntity; error?: string } {
  if (typeof input.name !== 'string' || input.name.trim().length < 2) {
    return { error: 'an entity needs a name (string, ≥ 2 chars) — sandbox names are labeled (demo) automatically' }
  }
  const jurisdiction = (input.jurisdiction ?? 'DE').toUpperCase()
  if (!JURISDICTIONS.includes(jurisdiction as (typeof JURISDICTIONS)[number])) {
    return { error: `unsupported jurisdiction '${input.jurisdiction}' — the sandbox serves: ${JURISDICTIONS.join(', ')}` }
  }
  const entityType = input.entityType === 'C-Corp' ? 'C-Corp' : 'LLC'
  if (input.parentId && !getEntity(ws, input.parentId)) {
    return { error: `unknown parentId '${input.parentId}' — see /entities` }
  }
  const n = ws.extraEntities.length + 1
  const name = input.name.trim()
  const entity: SeedEntity = {
    $context: 'https://schema.org.ai',
    $type: 'Entity',
    id: `ent-ws-${n}`,
    name: name.includes('(demo)') ? name : `${name} (demo)`,
    ein: `00-9${String(n).padStart(6, '0')}`,
    entityType,
    jurisdiction: jurisdiction as 'DE' | 'TX',
    status: 'active',
    formedOn: new Date().toISOString().slice(0, 10),
    registeredAgentId: jurisdiction === 'TX' ? 'ra-lonestar-tx' : 'ra-harbor-de',
    parentId: input.parentId,
    example: true,
    label: `[sandbox workspace — ephemeral] ${RETENTION_NOTE}`,
  }
  ws.extraEntities.push(entity)
  return { entity }
}
