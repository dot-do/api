/**
 * api.ht worker entry.
 *
 * One worker serves the whole zone: api.ht plus every {tool}.api.ht
 * subdomain (see wrangler.jsonc routes). Local dev uses path mode:
 * http://localhost:8787/ip/1.1.1.1 — links in responses adapt automatically.
 */

import { apiHt } from './src/app'

export default apiHt()
