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
  substrate: 'accounting-tax',
  projection: 'apis.accountants',
  motion: 'B2D',
  icp: {
    companyTypes: ['CPA/accounting firm', 'SMB finance function'],
    jobTypes: ['accountant', 'bookkeeper', 'controller', 'fractional CFO'],
  },
  personas: [
    { id: 'operator-firm-partner', role: 'firm partner operating the practice' },
    { id: 'customer-firm-systems-developer', role: 'developer at a firm-systems vendor integrating the functions catalog' },
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
