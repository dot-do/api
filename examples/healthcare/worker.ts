/**
 * healthcare worker entry — wave-zero custom site (spec §7.1: allowed and
 * deliberate; CNAME cutover to the unified workers.do lane is the extraction
 * target, not a wave-zero requirement). Served on the row-key placeholder
 * face — the name pair (api.hospital vs apis.healthcare) is an open #33
 * curation item and neither is claimed here.
 */

import { healthcare } from './src/app'

export default healthcare()
