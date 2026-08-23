/**
 * card.js — the capability card (/.well-known/agents.json): AXP Clause 6,
 * the normative shape (Appendix A.3 probe manifest included), generated from
 * the site manifest so the card can never drift from the routes it names.
 *
 * Presence-when-true throughout: interfaces.mcp appears ONLY when the door
 * exists; the two OPTIONAL DECLARED interfaces of Appendix A.8 — both
 * admission-pinned in the declaration-armed form: interfaces.digitalLink
 * (A.8.1, since apis-ax-axp@2.3.0 as check-digital-link-resolver) and
 * interfaces.testSuite (A.8.5, since apis-ax-axp@2.4.0 as
 * check-published-test-suite; the card seam is
 * { url?, package?, version?, export?, digest, environment?, runner? } — at
 * least one address, the digest as the SOLE byte authority over the pinned
 * artifact: a suite document, a natively served ES module, or an npm
 * package@version identity assertion per A.8.6.6; runner dialect declarative
 * suite@1 or executable vitest@1 per A.8.6) — ONLY when the manifest declares
 * them AND the thing
 * they name already answers, because presence is the declaration and a
 * declared interface is judged STRICTLY; monetization ONLY when metered;
 * docs/icp/family/attestationLadder ONLY when declared.
 *
 * Neither optional interface contributes to Clause 6's non-empty interfaces
 * demand — a resolver is a way to ADDRESS this origin and a suite a way to
 * AUDIT it, neither is a way to CALL it — so `http` is built independently of
 * both.
 */

import { buildProbes } from "./manifest.js";

/** Concrete GET entries — what the verifier's card parser counts as declared
 *  endpoints, and what probe pathnames may address (Appendix A.3). */
export function httpInterfaces(manifest) {
  const { origin, collection, pricing, routes, family, familyPath } = manifest;
  const urls = [
    { method: "GET", url: `${origin}${collection.path}` },
    { method: "GET", url: `${origin}/pricing` },
    { method: "GET", url: `${origin}/openapi.json` },
    { method: "GET", url: `${origin}/llms.txt` },
  ];
  if (family.length > 0) urls.push({ method: "GET", url: `${origin}${familyPath}` });
  if (pricing.model === "metered") urls.push({ method: "GET", url: `${origin}${pricing.offerPath}` });
  for (const r of routes) {
    if (r.method === "GET" && !r.path.includes("{")) urls.push({ method: "GET", url: `${origin}${r.path}` });
  }
  return urls;
}

/** The normative AXP capability card. */
export function buildCard(manifest) {
  const { origin, name, description, mcp, digitalLink, testSuite, docsUrl, conformanceUrl, icpUrl, verifyUrl, g2, family, familyPath, attestationLadder, pricing } = manifest;
  return {
    name,
    description,
    interfaces: {
      http: httpInterfaces(manifest),
      ...(mcp !== undefined && { mcp }),
      ...(digitalLink !== undefined && { digitalLink }),
      ...(testSuite !== undefined && { testSuite }),
    },
    openapi: `${origin}/openapi.json`,
    llms: `${origin}/llms.txt`,
    links: {
      openapi: `${origin}/openapi.json`,
      llms: `${origin}/llms.txt`,
      pricing: `${origin}/pricing`,
      ...(docsUrl !== undefined && { docs: docsUrl }),
      ...(icpUrl !== undefined && { icp: icpUrl }),
      ...(family.length > 0 && { family: `${origin}${familyPath}` }),
      /* axp-ext/rates-g2 §3 — the ruled placement: the published runnable-suite
         export rides links.verify, beside links.conformance (the verdict). */
      ...(verifyUrl !== undefined && { verify: verifyUrl }),
      conformance: conformanceUrl,
    },
    /* axp-ext/rates-g2 §4 — the ruled placement: G2/ICP coordinates as a
       TOP-LEVEL card object, carried verbatim from the manifest. */
    ...(g2 !== undefined && { g2 }),
    ...(attestationLadder !== undefined && { attestationLadder }),
    ...(pricing.model === "metered" && {
      monetization: {
        offers: pricing.offers,
        probe: { method: "GET", url: pricing.offerPath },
      },
    }),
    probes: buildProbes(manifest),
  };
}
