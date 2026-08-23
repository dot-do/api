/**
 * api.cleaning worker entry — wave-zero custom site (spec §7.1: allowed and
 * deliberate; CNAME cutover to the unified workers.do lane is the extraction
 * target, not a wave-zero requirement). NOTE: the api.cleaning name is held
 * with NO CF zone yet (Batch-S zone provisioning) — that blocks serving at
 * the domain only, never this build.
 */

import { apiCleaning } from './src/app'

export default apiCleaning()
