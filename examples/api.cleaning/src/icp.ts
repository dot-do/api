/**
 * icp.ts — the G2 coordinates document served at /icp.json and exposed on the
 * capability card's `g2` member (stake #6): ICP (CompanyType × JobTypes),
 * personas, and the System coordinate — from the register row, never
 * re-derived. The row's cell is two-sided: supply = the 5617 operators,
 * demand = the Facilities function inside every company (this vertical and
 * fn-facilities-assets are the two ends of one transaction).
 */

import { substrate } from './substrate'

const icp = {
  $context: 'https://schema.org.ai',
  $type: 'ICP',
  substrate: 'facilities-services',
  projection: 'api.cleaning',
  motion: 'B2A',
  icp: {
    companyTypes: ['janitorial company', 'landscaping company', 'pest-control operator', 'facility-management function (demand side, every company)'],
    jobTypes: ['owner-operator', 'ops scheduler', 'facility manager'],
  },
  personas: [
    { id: 'supply-owner-operator', role: 'owner-operator of a building-services company (supply side)' },
    { id: 'supply-ops-scheduler', role: 'ops scheduler dispatching recurring crews (supply side)' },
    { id: 'demand-facility-manager', role: 'facility manager buying the service (demand side — the fn-facilities-assets counterparty)' },
  ],
  systems: substrate.systems,
  agent_classes: [
    {
      id: 'anonymous',
      description:
        'any agent, keyless — the sandbox floor: every collection answers with labeled example data; tenant-scoped scopes answer a typed BLOCKED. Higher rungs (earned credits, human-claimed, paid) are keyed above this floor per the B2A ladder.',
    },
  ],
}

export default icp
