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
  substrate: 'restaurants-food-service',
  projection: 'apis.restaurant',
  motion: 'B2D',
  icp: {
    companyTypes: ['independent restaurant operator', 'small restaurant group', 'catering operator'],
    jobTypes: ['GM / owner-operator', 'kitchen manager', 'catering director'],
  },
  personas: [
    { id: 'operator-kitchen-manager', role: 'kitchen manager keeping par levels and month-end counts — the back-of-house paperwork function (the POS front is avoided by ruling), below the POS-incumbent line' },
    { id: 'customer-restaurant-systems-developer', role: 'developer at a restaurant-systems vendor integrating back-of-house inventory, counts, and supplier invoices' },
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
