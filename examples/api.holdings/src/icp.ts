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
  substrate: 'holdings-corporate-mgmt',
  projection: 'api.holdings',
  motion: 'B2D',
  icp: {
    companyTypes: ['holding company', 'family office', 'PE/venture portfolio operator', 'multi-entity founder / startup studio'],
    jobTypes: ['corporate ops', 'controller', 'paralegal', 'platform engineer'],
  },
  personas: [
    { id: 'operator-corporate-ops', role: 'corporate ops / controller / paralegal seat that owns formations and renewals' },
    { id: 'customer-portfolio-platform-developer', role: 'developer at a portfolio operator or family office building on the entity rail' },
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
