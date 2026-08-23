/**
 * axp-faces — the shared AXP machine-face generator (family-map P5, ONE
 * implementation). See ../README.md and the site-builder contract.
 */

export { defineSiteManifest, buildProbes } from "./manifest.js";
export { ok, empty, blocked, offer, envelopeResponse, collectionDecision } from "./envelope.js";
export {
  FACES,
  FACE_CONTENT_TYPE,
  FACE_MEDIA_TYPE,
  AGENT_UA_TOKENS,
  UNFURL_UA_TOKENS,
  CONNEG_VARY,
  faceFromExtension,
  faceFromAccept,
  faceFromClientClass,
  negotiate,
  faceAddress,
  linkAlternates,
  serveFace,
  serveNegotiated,
} from "./conneg.js";
export { buildCard, httpInterfaces } from "./card.js";
export { coverageDomain, coverageTag, tagsIn, auditCoverage, operationId, COVERAGE_TAG_RE } from "./coverage.js";
export { buildOpenapi } from "./openapi.js";
export { buildPricingDocument } from "./pricing.js";
export { llmsTail, buildLlmsTxt } from "./llms.js";
export { buildFamilyRegistry } from "./family.js";
export { createAxpRoutes } from "./routes.js";
