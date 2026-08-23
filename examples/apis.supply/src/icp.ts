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
  substrate: 'wholesale-distribution',
  projection: 'apis.supply',
  motion: 'B2D',
  icp: {
    companyTypes: ['distributor/wholesaler (sell side)', 'trading-partner procurement function (buy side)'],
    jobTypes: ['EDI analyst', 'integration engineer', 'order-operations manager', 'catalog/product-data ops'],
  },
  personas: [
    { id: 'operator-order-ops', role: 'order-operations lead at a distributor running the sell-side document rail' },
    { id: 'customer-integration-developer', role: 'developer at a trading partner or procurement-systems vendor integrating the PO/ASN/invoice flow' },
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
