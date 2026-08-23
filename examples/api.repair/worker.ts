/**
 * api.repair worker entry — wave-zero custom site (spec §7.1: allowed and
 * deliberate; CNAME cutover to the unified workers.do lane is the extraction
 * target, not a wave-zero requirement).
 */

import { apiRepair } from './src/app'

export default apiRepair()
