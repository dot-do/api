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
  substrate: 'passenger-mobility',
  projection: 'apis.taxi',
  motion: 'B2D',
  icp: {
    companyTypes: ['livery/limo operator', 'shuttle/charter operator', 'NEMT provider', 'taxi fleet'],
    jobTypes: ['fleet owner-operator', 'dispatch manager'],
  },
  personas: [
    { id: 'operator-fleet-owner', role: 'fleet owner-operator running dispatch and bookings' },
    { id: 'customer-dispatch-systems-developer', role: 'developer at a dispatch/booking systems vendor integrating the functions catalog' },
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
