/**
 * travel-tourism worker entry — wave-zero custom site (spec §7.1: allowed
 * and deliberate; CNAME cutover to the unified workers.do lane is the
 * extraction target, not a wave-zero requirement). Placeholder face: no
 * route/zone attaches until a name is ruled (#16) or a sub-vertical face
 * (apis.cruises / apis.voyage / apis.camp) goes live on its own zone.
 */

import { travelTourism } from './src/app'

export default travelTourism()
