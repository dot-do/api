/**
 * apis.taxi — wave-zero instantiation of register row `passenger-mobility`
 * as a @dotdo/api instance (property template spec, day-zero row).
 *
 * In this repo the example imports the framework from ../../src so it runs
 * (wrangler dev, vitest, tsc) without a build step. Outside the repo you
 * would `import { API } from '@dotdo/api'`.
 *
 * One worker, one substrate, both plies: the data face and the headless
 * system-of-record door (Scheduler⟨passenger-dispatch⟩ — dispatch + booking)
 * are the same collections; REST and MCP are emitted from the same store
 * functions.
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
    t('listTrips', 'List trips (typed; filter by status/date/vehicleId)', { status: { type: 'string' }, date: { type: 'string' }, vehicleId: { type: 'string' } }, (i) => {
      const q = i as { status?: string; date?: string; vehicleId?: string }
      return store
        .listTrips()
        .filter((x) => (q.status ? x.status === q.status : true))
        .filter((x) => (q.date ? x.date === q.date : true))
        .filter((x) => (q.vehicleId ? x.vehicleId === q.vehicleId : true))
    }),
    t('getTrip', 'One trip by id', id, (i) => store.getTrip((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('listReservations', 'Reservations (bookings) in the current workspace', { status: { type: 'string' } }, (i) => {
      const s = (i as { status?: string }).status
      return store.listReservations(ws).filter((r) => (s ? r.status === s : true))
    }),
    t('getReservation', 'One reservation by id', id, (i) => store.getReservation(ws, (i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('createReservation', 'Book a pickup (sandbox: ephemeral workspace)', { fromZone: { type: 'string' }, toZone: { type: 'string' }, serviceClass: { type: 'string' }, pickupAt: { type: 'string' } }, (i) =>
      store.createReservation(ws, i as store.CreateReservationInput),
    ),
    t('dispatchTrip', 'Dispatch a vehicle against a confirmed reservation — returns the 402 OFFER terms (settlement rail not yet activated; labeled stub, no charge can occur)', id, (i) => {
      const r = store.getReservation(ws, (i as { id?: string }).id ?? '')
      if (!r) return { message: 'not found' }
      return { type: 'OFFER', reservation: r.id, see: 'POST /reservations/{id}/dispatch', stub: 'settlement rail not yet activated — no charge can occur' }
    }),
    t('listFares', 'The published fare schedule (zone-pair × service class)', { serviceClass: { type: 'string' } }, (i) => {
      const sc = (i as { serviceClass?: string }).serviceClass
      return store.listFares().filter((f) => (sc ? f.serviceClass === sc : true))
    }),
    t('quoteFare', 'Quote a fare for a zone pair and service class', { fromZone: { type: 'string' }, toZone: { type: 'string' }, serviceClass: { type: 'string' } }, (i) => {
      const q = i as { fromZone?: string; toZone?: string; serviceClass?: string }
      return store.quoteFare(q.fromZone ?? '', q.toZone ?? '', q.serviceClass ?? '')
    }),
    t('listVehicles', 'The fleet: vehicles with service class and accessibility flags', {}, () => store.listVehicles()),
    t('getVehicle', 'One vehicle by id', id, (i) => store.getVehicle((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('listTransitSchedules', 'GTFS-typed transit schedules (synthetic, labeled)', { routeId: { type: 'string' } }, (i) => {
      const rid = (i as { routeId?: string }).routeId
      return store.listTransitSchedules().filter((s) => (rid ? s.routeId === rid : true))
    }),
    t('getTransitSchedule', 'One GTFS-typed schedule by id', id, (i) => store.getTransitSchedule((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
  ]
}

export function apisTaxi(): Hono<ApiEnv> {
  const ws = store.createWorkspace()
  return API({
    name: 'apis.taxi',
    description: "The functions a passenger fleet's systems call",
    version: '0.1.0',
    landing: false, // the machine face owns '/' (three-faced home via the vendored generator)
    mcp: { name: 'apis.taxi', version: '0.1.0', tools: mcpTools(ws) },
    routes: (app) => mountRoutes(app, ws),
  })
}
