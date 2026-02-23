export interface HostnameContext {
  mode: 'root' | 'service' | 'agent' | 'customer'
  service?: string
  domain?: string
}

const NAMED_AGENTS = new Set([
  'ada', 'amit', 'amy', 'andrew', 'ann', 'archie', 'ari', 'arya',
  'bailey', 'beau', 'blake', 'bob', 'bryant',
  'cara', 'casey', 'clara', 'cody', 'cole',
  'dana', 'dara', 'deb', 'devin', 'devon', 'diana', 'drew',
  'eko', 'eli', 'ella', 'emma', 'evie',
  'finn', 'fran',
  'gene', 'gio', 'gloria', 'grace', 'grant',
  'hal', 'hazel', 'henry',
  'ivy',
  'jack', 'jay', 'joe', 'jon', 'jules', 'jun',
  'kat', 'kate',
  'larry', 'lei', 'lena', 'leo', 'lexi', 'lia', 'liv', 'lou', 'luz',
  'mark', 'mary', 'maya', 'mel', 'mia', 'miles',
  'nat', 'nathan', 'ned', 'nia', 'nina', 'noa', 'noah', 'nolan',
  'oliver', 'oscar', 'otis', 'owen',
  'pam', 'peg', 'penny', 'perry', 'priya',
  'quinn',
  'rae', 'raj', 'ralph', 'reed', 'rex', 'rick', 'rob', 'rod', 'rory', 'rowan', 'ruby',
  'sage', 'sally', 'sam', 'samuel', 'sarah', 'sean', 'seth', 'sid', 'sierra', 'stella', 'susan',
  'tess', 'tom', 'tyler',
  'uma', 'umi', 'uri',
  'vera', 'vic',
  'wade',
  'xavi',
  'yuki',
  'zia', 'zoe', 'zuri',
])

const CSUITE = new Set(['cfo', 'cmo', 'coo', 'cpo', 'cro', 'cto'])

export function isNamedAgent(name: string): boolean {
  return NAMED_AGENTS.has(name) || CSUITE.has(name)
}

export function resolveHostname(hostname: string): HostnameContext {
  const host = hostname.split(':')[0]

  if (host === 'apis.do') {
    return { mode: 'root' }
  }

  if (host.endsWith('.do')) {
    const name = host.replace('.do', '')
    if (NAMED_AGENTS.has(name) || CSUITE.has(name)) {
      return { mode: 'agent', service: name }
    }
    return { mode: 'service', service: name }
  }

  return { mode: 'customer', domain: host }
}
