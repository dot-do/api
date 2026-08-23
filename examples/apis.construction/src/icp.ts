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
  substrate: 'construction',
  projection: 'apis.construction',
  motion: 'B2D',
  icp: {
    companyTypes: ['general contractor', 'specialty-trade subcontractor', 'owner/developer'],
    jobTypes: ['project accountant', 'construction PM', 'back-office controller'],
  },
  personas: [
    { id: 'operator-project-accountant', role: 'project accountant assembling draws and chasing lien waivers (the paperwork function, not the field — row avoid-class 2 note)' },
    { id: 'customer-construction-systems-developer', role: 'developer at a construction-systems vendor integrating the payment-documentation set' },
  ],
  systems: substrate.systems,
  agent_classes: [
    {
      id: 'anonymous',
      description: 'any agent, keyless — the sandbox floor: every collection answers with labeled example data; tenant-scoped scopes answer a typed BLOCKED',
    },
  ],
}

export default icp
