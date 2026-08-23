/**
 * icp.ts — the G2 coordinates document served at /icp.json and exposed on the
 * capability card's `g2` member (stake #6): ICP (CompanyType × JobTypes),
 * personas, and the System coordinates — from the register row, never
 * re-derived.
 */

import { substrate } from './substrate'
import { RETENTION_NOTE } from './seed'

const icp = {
  $context: 'https://schema.org.ai',
  $type: 'ICP',
  substrate: 'retail-ecommerce',
  projection: 'apis.shop',
  motion: 'B2A',
  icp: {
    companyTypes: ['online retailer', 'multichannel merchant', 'marketplace seller'],
    jobTypes: ['e-commerce ops manager', 'head of digital'],
  },
  personas: [
    { id: 'agent-buyer', role: 'autonomous purchasing agent hitting the Offer/Order surfaces — the row\'s stronger near-term buyer (Axis-2 ruling)' },
    { id: 'ecommerce-ops-manager', role: 'e-commerce ops manager whose OMS/storefront systems call these functions' },
    { id: 'head-of-digital', role: 'head of digital evaluating the machine face for the merchant\'s stack' },
  ],
  systems: substrate.systems,
  agent_classes: [
    {
      id: 'anonymous',
      description: `any agent, keyless — the sandbox floor: every collection answers with labeled example data; merchant-scoped scopes answer a typed BLOCKED. ${RETENTION_NOTE}`,
    },
  ],
} as const

export default icp
