/**
 * apis.construction — wave-zero instantiation of register row `construction`
 * as a @dotdo/api instance (property template spec §7.3 MUSTs, built for real).
 *
 * In this repo the example imports the framework from ../../src so it runs
 * (wrangler dev, vitest, tsc) without a build step. Outside the repo you
 * would `import { API } from '@dotdo/api'`.
 *
 * One worker, one substrate, both plies: the data face and the headless
 * system-of-record door (ProjectManagement⟨construction-pm⟩) are the same
 * collections; REST and MCP are emitted from the same store functions.
 */

import type { Hono } from 'hono'
import { API } from '../../../src'
import type { ApiEnv, McpTool } from '../../../src/types'
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
    t('listDrawPackages', 'List draw packages (typed; filter by status/period/project)', { status: { type: 'string' }, period: { type: 'string' }, project: { type: 'string' } }, (i) => {
      const q = i as { status?: string; period?: string; project?: string }
      return store
        .listDrawPackages()
        .filter((d) => (q.status ? d.status === q.status : true))
        .filter((d) => (q.period ? d.period === q.period : true))
        .filter((d) => (q.project ? d.projectId === q.project : true))
    }),
    t('getDrawPackage', 'One draw package by id', id, (i) => store.getDrawPackage((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('orderDrawPackage', 'Order the completed, verified assembly of a draw package — returns the 402 OFFER terms (settlement rail not yet activated; no charge can occur — test-mode)', id, (i) => {
      const d = store.getDrawPackage((i as { id?: string }).id ?? '')
      if (!d) return { message: 'not found' }
      return { type: 'OFFER', drawPackage: d.id, see: 'POST /draw-packages/{id}/order', stub: 'settlement rail not yet activated — no charge can occur' }
    }),
    t('listPayApplications', 'Pay applications (filter by period/project)', { period: { type: 'string' }, project: { type: 'string' } }, (i) => {
      const q = i as { period?: string; project?: string }
      return store
        .listPayApplications(ws)
        .filter((a) => (q.period ? a.period === q.period : true))
        .filter((a) => (q.project ? a.projectId === q.project : true))
    }),
    t('getPayApplication', 'One pay application by id', id, (i) => store.getPayApplication(ws, (i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('submitPayApplication', 'Submit a pay application for a project (sandbox: ephemeral workspace)', { projectId: { type: 'string' }, period: { type: 'string' }, lines: { type: 'array' } }, (i) => {
      const q = i as { projectId?: string } & store.SubmitPayApplicationInput
      return store.submitPayApplication(ws, q.projectId ?? '', q)
    }),
    t('listLienWaivers', 'Lien waivers (filter by waiverType/project)', { waiverType: { type: 'string' }, project: { type: 'string' } }, (i) => {
      const q = i as { waiverType?: string; project?: string }
      return store
        .listLienWaivers()
        .filter((w) => (q.waiverType ? w.waiverType === q.waiverType : true))
        .filter((w) => (q.project ? w.projectId === q.project : true))
    }),
    t('getLienWaiver', 'One lien waiver by id', id, (i) => store.getLienWaiver((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('listPermits', 'Permit records (filter by project)', { project: { type: 'string' } }, (i) => {
      const q = i as { project?: string }
      return store.listPermits().filter((p) => (q.project ? p.projectId === q.project : true))
    }),
    t('getPermit', 'One permit record by id', id, (i) => store.getPermit((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('listProjects', 'Projects of the current contractor workspace', {}, () => store.listProjects()),
    t('getProject', 'One project by id', id, (i) => store.getProject((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
  ]
}

export function apisConstruction(): Hono<ApiEnv> {
  const ws = store.createWorkspace()
  return API({
    name: 'apis.construction',
    description: "The functions a construction back office's systems call",
    version: '0.1.0',
    landing: false, // the machine face owns '/' (three-faced home via the vendored generator)
    mcp: { name: 'apis.construction', version: '0.1.0', tools: mcpTools(ws) },
    routes: (app) => mountRoutes(app, ws),
  })
}
