/**
 * store.ts — the sandbox workspace: the §5.2 seed corpus (tenant #1, the
 * live-demo ruling — same handlers as product) plus an EPHEMERAL in-memory
 * anonymous workspace for writes (per-isolate, disclosed retention, never
 * persisted). One service layer — the REST routes and the MCP tools both
 * call these functions: one definition, two transports.
 */

import {
  DRAW_PACKAGES,
  LIEN_WAIVERS,
  PAY_APPLICATIONS,
  PERMITS,
  PROJECTS,
  RETENTION_NOTE,
  type PayApplicationLine,
  type SeedPayApplication,
} from './seed'

export interface Workspace {
  extraPayApplications: SeedPayApplication[]
}

export function createWorkspace(): Workspace {
  return { extraPayApplications: [] }
}

export const listProjects = () => PROJECTS
export const getProject = (id: string) => PROJECTS.find((p) => p.id === id)
export const listPermits = () => PERMITS
export const getPermit = (id: string) => PERMITS.find((p) => p.id === id)
export const listLienWaivers = () => LIEN_WAIVERS
export const getLienWaiver = (id: string) => LIEN_WAIVERS.find((w) => w.id === id)
export const listDrawPackages = () => DRAW_PACKAGES
export const getDrawPackage = (id: string) => DRAW_PACKAGES.find((d) => d.id === id)

export function listPayApplications(ws: Workspace): SeedPayApplication[] {
  return [...PAY_APPLICATIONS, ...ws.extraPayApplications]
}

export function getPayApplication(ws: Workspace, id: string): SeedPayApplication | undefined {
  return listPayApplications(ws).find((a) => a.id === id)
}

export interface SubmitPayApplicationInput {
  period?: string
  lines?: PayApplicationLine[]
}

/**
 * The headless system-of-record door's write verb: submit a pay application
 * into the EPHEMERAL anonymous workspace. Validation is real (the arithmetic
 * identity is enforced at the door, not just in the seed).
 */
export function submitPayApplication(
  ws: Workspace,
  projectId: string,
  input: SubmitPayApplicationInput,
): { application?: SeedPayApplication; error?: string } {
  const project = PROJECTS.find((p) => p.id === projectId)
  if (!project) return { error: `unknown project '${projectId}' — see /projects` }
  if (!input.period || !/^\d{4}-\d{2}$/.test(input.period)) return { error: "a pay application needs a period like '2026-08'" }
  const lines = Array.isArray(input.lines) ? input.lines : []
  if (lines.length < 1) return { error: 'a pay application needs at least one schedule-of-values line' }
  let thisPeriod = 0
  for (const line of lines) {
    if (typeof line.description !== 'string' || typeof line.scheduledValue !== 'number' || typeof line.thisPeriod !== 'number' || line.thisPeriod < 0) {
      return { error: 'every line needs { description: string, scheduledValue: number, thisPeriod: number >= 0 }' }
    }
    thisPeriod += line.thisPeriod
  }
  const prior = PAY_APPLICATIONS.filter((a) => a.projectId === projectId)
  const priorCompleted = prior.reduce((max, a) => Math.max(max, a.completedToDate), 0)
  const previousPayments = prior.filter((a) => a.status === 'paid').reduce((s, a) => s + a.currentPaymentDue, 0)
  const completedToDate = priorCompleted + thisPeriod
  if (completedToDate > project.contractSum) {
    return { error: `completed-to-date ${completedToDate} would exceed the contract sum ${project.contractSum}` }
  }
  const retainageHeld = completedToDate * (project.retainagePct / 100)
  const application: SeedPayApplication = {
    $context: 'https://schema.org.ai',
    $type: 'PayApplication',
    id: `pa-ws-${ws.extraPayApplications.length + 1}`,
    projectId,
    period: input.period,
    applicationNumber: prior.length + ws.extraPayApplications.filter((a) => a.projectId === projectId).length + 1,
    lines,
    contractSum: project.contractSum,
    completedToDate,
    retainageHeld,
    previousPayments,
    currentPaymentDue: completedToDate - retainageHeld - previousPayments,
    status: 'submitted',
    example: true,
    label: `[sandbox workspace — ephemeral] ${RETENTION_NOTE}`,
  }
  ws.extraPayApplications.push(application)
  return { application }
}
