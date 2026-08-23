/**
 * llms.js — the llms.txt machine-surfaces tail (AXP Clause 2 SHOULD-cross-refs
 * + the AX linkset), appended to each site's HAND-WRITTEN body: the sentences
 * are the site's own; only the cross-link lines are generated, so the linkset
 * can never drift from the card and the contract.
 */

export function llmsTail(manifest) {
  const { origin, conformanceUrl, icpUrl, docsUrl, family, familyPath } = manifest;
  const lines = [
    "## Machine surfaces",
    "",
    `- Capability card (AXP probe manifest): ${origin}/.well-known/agents.json`,
    `- OpenAPI 3.1 contract: ${origin}/openapi.json`,
    `- Pricing Document: ${origin}/pricing`,
    ...(icpUrl !== undefined ? [`- icp.json (agent classes): ${icpUrl}`] : []),
    ...(docsUrl !== undefined ? [`- Documentation: ${docsUrl}`] : []),
    ...(family.length > 0 ? [`- Family registry (sibling doors as typed edges): ${origin}${familyPath}`] : []),
    `- This file: ${origin}/llms.txt`,
    `- Conformance (independent verifier): ${conformanceUrl}`,
  ];
  if (family.length > 0) {
    lines.push("", "## The family", "");
    for (const f of family) {
      lines.push(`- ${f.name}${f.role ? ` — ${f.role}` : ""}: ${f.origin}/`);
    }
  }
  return lines.join("\n") + "\n";
}

/** The full llms.txt: the site's hand-written markdown body + the generated tail. */
export function buildLlmsTxt(manifest) {
  if (!manifest.llms) {
    throw new Error("axp-faces llms: manifest.llms.body is not declared — serve your static llms.txt and append llmsTail(manifest) at build time instead");
  }
  return manifest.llms.body.trimEnd() + "\n\n" + llmsTail(manifest);
}
