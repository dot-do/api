/**
 * icp.ts — the G2 coordinates document served at /icp.json and exposed on the
 * capability card's `g2` member (stake #6): ICP (CompanyType × JobTypes),
 * personas, and the System coordinate — from the register row, never
 * re-derived.
 */

import { substrate } from './substrate'

const icp = {
  $context: 'https://schema.org.ai',
  $type: 'ICP',
  substrate: 'healthcare',
  projection: 'healthcare.org.ai',
  motion: 'B2D',
  icp: {
    companyTypes: ['medical practice / provider group', 'hospital / health system', 'dental practice', 'billing/RCM vendor'],
    jobTypes: ['credentialing coordinator', 'practice manager', 'billing/RCM manager'],
  },
  personas: [
    { id: 'operator-credentialing-coordinator', role: 'credentialing coordinator keeping the roster, licenses, and payer enrollments current' },
    { id: 'customer-practice-systems-developer', role: 'developer at a practice-management / RCM systems vendor integrating the credentialing functions' },
    { id: 'buyer-payer-roster', role: 'payer-side roster-product buyer — the top rung of the row enrichment ladder (recorded; no roster product is served at wave zero)' },
  ],
  systems: substrate.systems,
  agent_classes: [
    {
      id: 'anonymous',
      description: 'any agent, keyless — the sandbox floor: every collection answers with labeled synthetic example data; tenant-scoped scopes answer a typed BLOCKED',
    },
  ],
}

export default icp
