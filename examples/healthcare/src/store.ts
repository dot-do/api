/**
 * store.ts — the sandbox workspace: the §5.2 seed corpus (tenant #1, the
 * live-demo ruling — same handlers as product) plus an EPHEMERAL in-memory
 * anonymous workspace for writes (per-isolate, disclosed retention, never
 * persisted). One service layer — the REST routes and the MCP tools both
 * call these functions: one definition, two transports (the two plies are
 * the same collections; only binding direction differs).
 */

import {
  CREDENTIALS,
  ELIGIBILITY_RECORDS,
  ENROLLMENTS,
  PAYERS,
  PRIOR_AUTH_ARTIFACTS,
  PROVIDERS,
  RETENTION_NOTE,
  SUPERBILLS,
  type SeedCredential,
  type SeedEligibilityRecord,
  type SeedEnrollment,
  type CredentialKind,
} from './seed'
import { CREDENTIAL_KINDS } from './substrate'

export interface Workspace {
  extraCredentials: SeedCredential[]
  extraEnrollments: SeedEnrollment[]
}

export function createWorkspace(): Workspace {
  return { extraCredentials: [], extraEnrollments: [] }
}

export const listProviders = () => PROVIDERS
export const getProvider = (id: string) => PROVIDERS.find((p) => p.id === id)
export const listPriorAuthArtifacts = () => PRIOR_AUTH_ARTIFACTS
export const getPriorAuthArtifact = (id: string) => PRIOR_AUTH_ARTIFACTS.find((a) => a.id === id)
export const listEligibilityRecords = () => ELIGIBILITY_RECORDS
export const getEligibilityRecord = (id: string) => ELIGIBILITY_RECORDS.find((e) => e.id === id)
export const listSuperbills = () => SUPERBILLS
export const getSuperbill = (id: string) => SUPERBILLS.find((s) => s.id === id)

export const listCredentials = (ws: Workspace): SeedCredential[] => [...CREDENTIALS, ...ws.extraCredentials]
export const getCredential = (ws: Workspace, id: string) => listCredentials(ws).find((c) => c.id === id)
export const listEnrollments = (ws: Workspace): SeedEnrollment[] => [...ENROLLMENTS, ...ws.extraEnrollments]
export const getEnrollment = (ws: Workspace, id: string) => listEnrollments(ws).find((e) => e.id === id)

export function checkEligibility(providerId: string, payerId: string): { record?: SeedEligibilityRecord; error?: string } {
  if (!getProvider(providerId)) return { error: `unknown providerId '${providerId}' — see /providers` }
  if (!PAYERS.some((p) => p.id === payerId)) return { error: `unknown payerId '${payerId}' — payers: ${PAYERS.map((p) => p.id).join(', ')}` }
  const record = ELIGIBILITY_RECORDS.find((e) => e.providerId === providerId && e.payerId === payerId)
  if (!record) return { error: `no eligibility record for ${providerId} × ${payerId} — a truthful miss, not an error; see /eligibility-records` }
  return { record }
}

export interface AddCredentialInput {
  providerId?: string
  kind?: string
  expiresOn?: string
}

export function addCredential(ws: Workspace, input: AddCredentialInput): { credential?: SeedCredential; error?: string } {
  const { providerId, kind } = input
  if (!providerId || !kind) return { error: 'a credential needs { providerId, kind } — kinds: ' + CREDENTIAL_KINDS.join(', ') }
  if (!getProvider(providerId)) return { error: `unknown providerId '${providerId}' — see /providers` }
  if (!(CREDENTIAL_KINDS as readonly string[]).includes(kind)) {
    return { error: `unknown kind '${kind}' — kinds: ${CREDENTIAL_KINDS.join(', ')}` }
  }
  const n = ws.extraCredentials.length + 1
  const credential: SeedCredential = {
    $context: 'https://schema.org.ai',
    $type: 'Credential',
    id: `cred-ws-${n}`,
    providerId,
    kind: kind as CredentialKind,
    identifier: `DEMO-WS-${String(n).padStart(4, '0')}`,
    issuedBy: 'sandbox workspace (ephemeral)',
    status: 'pending-verification',
    expiresOn: input.expiresOn ?? '2027-12-31',
    example: true,
    label: `[sandbox workspace — ephemeral] ${RETENTION_NOTE}`,
  }
  ws.extraCredentials.push(credential)
  return { credential }
}

export interface CreateEnrollmentInput {
  providerId?: string
  payerId?: string
}

export function createEnrollment(ws: Workspace, input: CreateEnrollmentInput): { enrollment?: SeedEnrollment; error?: string } {
  const { providerId, payerId } = input
  if (!providerId || !payerId) return { error: 'an enrollment packet needs { providerId, payerId } — see /providers and /eligibility-records for payer ids' }
  if (!getProvider(providerId)) return { error: `unknown providerId '${providerId}' — see /providers` }
  if (!PAYERS.some((p) => p.id === payerId)) return { error: `unknown payerId '${payerId}' — payers: ${PAYERS.map((p) => p.id).join(', ')}` }
  const credentialIds = listCredentials(ws)
    .filter((c) => c.providerId === providerId)
    .map((c) => c.id)
  const enrollment: SeedEnrollment = {
    $context: 'https://schema.org.ai',
    $type: 'Enrollment',
    id: `enr-ws-${ws.extraEnrollments.length + 1}`,
    providerId,
    payerId,
    credentialIds,
    status: credentialIds.length > 0 ? 'ready' : 'draft',
    openedOn: new Date().toISOString().slice(0, 10),
    example: true,
    label: `[sandbox workspace — ephemeral] ${RETENTION_NOTE}`,
  }
  ws.extraEnrollments.push(enrollment)
  return { enrollment }
}
