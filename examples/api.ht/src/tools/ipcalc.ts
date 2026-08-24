/**
 * ipcalc.api.ht/{cidr} — IPv4 CIDR math (offline, exact): network, broadcast,
 * mask, usable range. Addresses cross-link into ip views.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue } from '../registry'

export function ipv4ToInt(ip: string): number | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return null
  const octets = m.slice(1).map(Number)
  if (octets.some((o) => o > 255)) return null
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0
}

export const intToIpv4 = (n: number): string => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')

const RFC1918 = [
  { base: ipv4ToInt('10.0.0.0')!, bits: 8 },
  { base: ipv4ToInt('172.16.0.0')!, bits: 12 },
  { base: ipv4ToInt('192.168.0.0')!, bits: 16 },
]

export const ipcalcTool: HypertextTool = {
  name: 'ipcalc',
  description: 'IPv4 CIDR calculator — network, broadcast, mask, usable host range',
  valueSyntax: '<ip>/<prefix> (e.g. 192.168.1.0/24)',
  examples: ['192.168.1.0/24', '10.0.0.0/8', '1.1.1.1/32'],
  source: 'Offline — exact bitwise math',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const m = value.trim().match(/^(.+)\/(\d{1,2})$/)
    if (!m) return badValue(`'${value}' is not CIDR notation (ip/prefix)`)
    const addr = ipv4ToInt(m[1])
    const prefix = Number(m[2])
    if (addr === null) return badValue(`'${m[1]}' is not a valid IPv4 address`)
    if (prefix > 32) return badValue(`/${prefix} is not a valid IPv4 prefix (0-32)`)

    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
    const network = (addr & mask) >>> 0
    const broadcast = (network | (~mask >>> 0)) >>> 0
    const total = 2 ** (32 - prefix)
    const usable = prefix >= 31 ? total : total - 2
    const firstHost = prefix >= 31 ? network : network + 1
    const lastHost = prefix >= 31 ? broadcast : broadcast - 1
    const isPrivate = RFC1918.some((r) => (addr >>> (32 - r.bits)) === (r.base >>> (32 - r.bits)))

    return {
      data: {
        cidr: `${intToIpv4(network)}/${prefix}`,
        input: m[1],
        network: intToIpv4(network),
        broadcast: intToIpv4(broadcast),
        netmask: intToIpv4(mask),
        wildcard: intToIpv4(~mask >>> 0),
        prefixLength: prefix,
        totalAddresses: total,
        usableHosts: usable,
        firstHost: ctx.links.href('ip', intToIpv4(firstHost)),
        lastHost: ctx.links.href('ip', intToIpv4(lastHost)),
        privateRfc1918: isPrivate,
        source: this.source,
      },
      links: {
        networkIp: isPrivate ? undefined : ctx.links.href('ip', intToIpv4(network)),
        supernet: prefix > 0 ? ctx.links.href('ipcalc', `${intToIpv4((addr & ((0xffffffff << (33 - prefix)) >>> 0)) >>> 0)}/${prefix - 1}`) : undefined,
      },
    }
  },
}
