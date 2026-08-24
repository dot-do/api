/**
 * healthcare — wave-zero instantiation of register row `healthcare` as a
 * @dotdo/api instance (property template spec §7.3 MUSTs, built for real
 * under the ROW KEY: the name pair api.hospital vs apis.healthcare is an
 * open #33 curation item and this build claims neither).
 *
 * In this repo the example imports the framework from ../../../core/src (the
 * @dotdo/api package) so it runs (wrangler dev, vitest, tsc) without a build
 * step. Outside the repo you would `import { API } from '@dotdo/api'`.
 *
 * One worker, one substrate, both plies: the data face and the headless
 * system-of-record door (Credentialing⟨healthcare-provider-organizations⟩)
 * are the same collections; REST and MCP are emitted from the same store
 * functions. Mounted-rungs-only: the MCP door is the authless sandbox rung.
 */

import type { Hono } from 'hono'
import { API } from '../../../core/src'
import type { ApiEnv, McpTool } from '../../../core/src/types'
import { mountRoutes } from './routes'
import * as store from './store'
import { emitMeter } from './seams'

function mcpTools(ws: store.Workspace): McpTool[] {
  const t = (name: string, description: string, inputSchema: Record<string, unknown>, handler: (input: unknown) => unknown): McpTool => ({
    name,
    description,
    inputSchema: { type: 'object', properties: inputSchema },
    handler: async (input) => {
      emitMeter(name, 'anon-sandbox')
      return handler(input ?? {})
    },
  })
  const id = { id: { type: 'string' } }
  return [
    t('listProviders', 'List provider roster records (typed; filter by specialty/state/status) — labeled synthetic derivatives only (the [COUNSEL] boundary)', { specialty: { type: 'string' }, state: { type: 'string' }, status: { type: 'string' } }, (i) => {
      const q = i as { specialty?: string; state?: string; status?: string }
      return store
        .listProviders()
        .filter((x) => (q.specialty ? x.specialty === q.specialty : true))
        .filter((x) => (q.state ? x.state === q.state : true))
        .filter((x) => (q.status ? x.status === q.status : true))
    }),
    t('getProvider', 'One provider roster record by id', id, (i) => store.getProvider((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('listCredentials', 'Credential records (licenses, board certifications, registrations) — the credentialing system-of-record door', { providerId: { type: 'string' }, status: { type: 'string' } }, (i) => {
      const q = i as { providerId?: string; status?: string }
      return store
        .listCredentials(ws)
        .filter((x) => (q.providerId ? x.providerId === q.providerId : true))
        .filter((x) => (q.status ? x.status === q.status : true))
    }),
    t('getCredential', 'One credential record by id', id, (i) => store.getCredential(ws, (i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('addCredential', 'Attach a credential record to a provider (sandbox: ephemeral workspace)', { providerId: { type: 'string' }, kind: { type: 'string' }, expiresOn: { type: 'string' } }, (i) =>
      store.addCredential(ws, i as store.AddCredentialInput),
    ),
    t('listEnrollments', 'Payer-enrollment packets (PECOS-grain lifecycle)', { status: { type: 'string' } }, (i) => {
      const s = (i as { status?: string }).status
      return store.listEnrollments(ws).filter((e) => (s ? e.status === s : true))
    }),
    t('getEnrollment', 'One enrollment packet by id', id, (i) => store.getEnrollment(ws, (i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('createEnrollment', 'Open a payer-enrollment packet for a provider (sandbox: ephemeral workspace)', { providerId: { type: 'string' }, payerId: { type: 'string' } }, (i) =>
      store.createEnrollment(ws, i as store.CreateEnrollmentInput),
    ),
    t('submitEnrollment', 'Submit a ready enrollment packet to a payer — returns the 402 OFFER terms (settlement rail not yet activated; labeled stub, no charge can occur, no packet leaves the sandbox)', id, (i) => {
      const e = store.getEnrollment(ws, (i as { id?: string }).id ?? '')
      if (!e) return { message: 'not found' }
      return { type: 'OFFER', enrollment: e.id, see: 'POST /enrollments/{id}/submit', stub: 'settlement rail not yet activated — no charge can occur' }
    }),
    t('listPriorAuthArtifacts', 'Prior-auth artifacts (X12 278-shaped, synthetic, labeled)', { disposition: { type: 'string' } }, (i) => {
      const d = (i as { disposition?: string }).disposition
      return store.listPriorAuthArtifacts().filter((a) => (d ? a.disposition === d : true))
    }),
    t('getPriorAuthArtifact', 'One prior-auth artifact by id', id, (i) => store.getPriorAuthArtifact((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('listEligibilityRecords', 'Eligibility records (X12 270/271-shaped, synthetic, labeled)', { payerId: { type: 'string' } }, (i) => {
      const p = (i as { payerId?: string }).payerId
      return store.listEligibilityRecords().filter((e) => (p ? e.payerId === p : true))
    }),
    t('getEligibilityRecord', 'One eligibility record by id', id, (i) => store.getEligibilityRecord((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('checkEligibility', 'Check coverage for a provider × payer pair against the sandbox corpus', { providerId: { type: 'string' }, payerId: { type: 'string' } }, (i) => {
      const q = i as { providerId?: string; payerId?: string }
      return store.checkEligibility(q.providerId ?? '', q.payerId ?? '')
    }),
    t('listSuperbills', 'Superbill/EOB artifacts (line-itemed, synthetic, labeled)', { providerId: { type: 'string' } }, (i) => {
      const p = (i as { providerId?: string }).providerId
      return store.listSuperbills().filter((s) => (p ? s.providerId === p : true))
    }),
    t('getSuperbill', 'One superbill by id', id, (i) => store.getSuperbill((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
  ]
}

export function healthcare(): Hono<ApiEnv> {
  const ws = store.createWorkspace()
  return API({
    name: 'healthcare',
    description: "The credentialing and enrollment functions a provider organization's systems call (non-PHI admin artifacts only)",
    version: '0.1.0',
    landing: false, // the machine face owns '/' (three-faced home via the vendored generator)
    mcp: { name: 'healthcare', version: '0.1.0', tools: mcpTools(ws) },
    routes: (app) => mountRoutes(app, ws),
  })
}
