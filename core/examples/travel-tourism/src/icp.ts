/**
 * icp.ts — the G2 coordinates document served at /icp.json and exposed on the
 * capability card's `g2` member (stake #6): ICP (CompanyType × JobTypes),
 * personas, and the System coordinates — from the register row, never
 * re-derived.
 */

import { substrate } from './substrate'

const icp = {
  $context: 'https://schema.org.ai',
  $type: 'ICP',
  substrate: 'travel-tourism',
  projection: 'travel-tourism.org.ai (placeholder — 5615 apex GAP, #16; ruled posture = per-sub-vertical properties on held names)',
  motion: 'B2A',
  icp: {
    companyTypes: ['travel agency', 'tour operator', 'charter operator', 'camp operator'],
    jobTypes: ['agency owner', 'operations manager', 'charter director', 'camp director'],
  },
  personas: [
    { id: 'operator-ops-manager', role: 'operations manager at a tour/charter/camp operator running bookings' },
    { id: 'developer-booking-vendor', role: 'developer at a booking-engine or operator back-office vendor' },
    { id: 'autonomous-agent', role: 'agent booking charters, group travel, or camp sessions on behalf of a principal (consumer demand is agent-intermediated, B2A2C free-rider)' },
  ],
  systems: substrate.systems,
  agent_classes: [
    {
      id: 'anonymous',
      description: 'any agent, keyless — the sandbox floor: every collection answers with labeled example data; operator-scoped scopes answer a typed BLOCKED',
    },
  ],
}

export default icp
