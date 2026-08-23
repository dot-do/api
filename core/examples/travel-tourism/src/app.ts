/**
 * travel-tourism — wave-zero instantiation of register row `travel-tourism`
 * as a @dotdo/api instance (D-row placeholder: the 5615 apex name is a
 * recorded GAP #16; the ruled posture is per-sub-vertical properties on the
 * held names, which project this same substrate).
 *
 * In this repo the example imports the framework from ../../src so it runs
 * (wrangler dev, vitest, tsc) without a build step. Outside the repo you
 * would `import { API } from '@dotdo/api'`.
 *
 * One worker, one substrate, both plies: the data face and the headless
 * system-of-record doors (Booking⟨tour-operators⟩ / ⟨charter-operators⟩ /
 * ⟨camp-operators⟩) are the same collections; REST and MCP are emitted from
 * the same store functions.
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
    t('listBookings', 'List bookings (typed; filter by status/subVertical)', { status: { type: 'string' }, subVertical: { type: 'string' } }, (i) => {
      const q = i as { status?: string; subVertical?: string }
      return store
        .listBookings(ws)
        .filter((b) => (q.status ? b.status === q.status : true))
        .filter((b) => (q.subVertical ? b.subVertical === q.subVertical : true))
    }),
    t('getBooking', 'One booking by id', id, (i) => store.getBooking(ws, (i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('createBooking', 'Create a booking (sandbox: ephemeral workspace)', { subVertical: { type: 'string' }, itemRef: { type: 'string' }, partySize: { type: 'number' } }, (i) =>
      store.createBooking(ws, i as store.CreateBookingInput),
    ),
    t('confirmBooking', 'Confirm a booking (outcome grain) — returns the 402 OFFER terms (settlement rail not yet activated; labeled stub, no charge can occur)', id, (i) => {
      const b = store.getBooking(ws, (i as { id?: string }).id ?? '')
      if (!b) return { message: 'not found' }
      return { type: 'OFFER', booking: b.id, see: 'POST /bookings/{id}/confirm', stub: 'settlement rail not yet activated — no charge can occur' }
    }),
    t('listTrips', 'Itinerary/trip records', {}, () => store.listTrips()),
    t('getTrip', 'One trip with its segments', id, (i) => store.getTrip((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('listSailings', 'Sailings/charter departures with manifest capacity', { subVertical: { type: 'string' } }, (i) => {
      const sub = (i as { subVertical?: string }).subVertical
      return store.listSailings().filter((s) => (sub ? s.subVertical === sub : true))
    }),
    t('getSailing', 'One sailing with its manifest summary', id, (i) => store.getSailing((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('listCampSessions', 'Camp sessions with enrollment rosters', {}, () => store.listCampSessions(ws)),
    t('getCampSession', 'One camp session with its roster', id, (i) => store.getCampSession(ws, (i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('enrollCamper', 'Enroll into a camp session roster (sandbox: ephemeral workspace)', { sessionId: { type: 'string' }, camperAgeBand: { type: 'string' } }, (i) => {
      const q = i as { sessionId?: string; camperAgeBand?: string }
      return store.enrollCamper(ws, q.sessionId ?? '', q)
    }),
    t('listOperators', 'Tour/charter/camp operators and agencies (5615 grain)', {}, () => store.listOperators()),
  ]
}

export function travelTourism(): Hono<ApiEnv> {
  const ws = store.createWorkspace()
  return API({
    name: 'travel-tourism.org.ai',
    description: 'The travel-tourism booking substrate for the unserved sub-verticals (placeholder face — 5615 apex GAP)',
    version: '0.1.0',
    landing: false, // the machine face owns '/' (three-faced home via the vendored generator)
    mcp: { name: 'travel-tourism.org.ai', version: '0.1.0', tools: mcpTools(ws) },
    routes: (app) => mountRoutes(app, ws),
  })
}
