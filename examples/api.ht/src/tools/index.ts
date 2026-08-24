/**
 * The api.ht tool catalog.
 *
 * Expansion path: every new subdomain is one HypertextTool object added here.
 * The estate previously ran hundreds of such tools; the target is thousands —
 * ssl.api.ht, geo.api.ht, email.api.ht, vin.api.ht, barcode.api.ht, ... —
 * each ~100 lines wrapping a data source with the same link grammar.
 */

import type { ToolRegistry } from '../registry'
import { dnsTool } from './dns'
import { ipTool } from './ip'
import { asnTool } from './asn'
import { whoisTool } from './whois'
import { phoneTool } from './phone'
import { entityTool } from './entity'
import { shapesTool } from './shapes'

export function createTools(): ToolRegistry {
  return {
    ip: ipTool,
    dns: dnsTool,
    whois: whoisTool,
    phone: phoneTool,
    asn: asnTool,
    entity: entityTool,
    shapes: shapesTool,
  }
}
