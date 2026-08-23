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
  substrate: 'repair-field-services',
  projection: 'api.repair',
  motion: 'B2A',
  register: {
    row: 'repair-field-services',
    kind: 'vertical',
    naics: '811 ex-8111 (8112 electronics/precision, 8113 commercial machinery, 8114 personal & household goods)',
    grain: 'THE work order / estimate / inspection report [SC #14]',
  },
  icp: {
    companyTypes: ['electronics repair shop', 'machinery/industrial service company', 'appliance repair operator'],
    jobTypes: ['service manager', 'dispatcher', 'estimator'],
  },
  personas: [
    { id: 'operator-service-manager', role: 'service manager running the shop or field operation' },
    { id: 'operator-dispatcher', role: 'dispatcher routing work orders — entry is the record, not the truck [SC #14]' },
    { id: 'operator-estimator', role: 'estimator pricing repair jobs' },
  ],
  systems: substrate.systems,
  agent_classes: [
    {
      id: 'anonymous',
      description:
        'any agent, keyless — the sandbox floor: every collection answers with labeled example data; tenant-scoped scopes answer a typed BLOCKED; writes land in an ephemeral workspace',
    },
  ],
}

export default icp
