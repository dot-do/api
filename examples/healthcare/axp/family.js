/**
 * family.js — the family-registry endpoint data: the sibling doors of this
 * property's family and their seams as TYPED EDGES, so an agent at any one
 * door discovers the other properties as contracts, not links.
 *
 * Presence-when-true: every member of an edge is the site builder's explicit
 * declaration — the generator adds no claim about a sibling's surfaces. A
 * sibling's `llms`/`card` URLs appear only when the manifest entry declares
 * them (i.e. when that sibling actually serves them).
 */

export function buildFamilyRegistry(manifest) {
  const { origin, name, description, homeContext, family, familyPath } = manifest;
  return {
    $context: homeContext,
    $type: "FamilyRegistry",
    $id: `${origin}${familyPath}`,
    self: {
      name,
      origin,
      description,
      llms: `${origin}/llms.txt`,
      card: `${origin}/.well-known/agents.json`,
      openapi: `${origin}/openapi.json`,
      pricing: `${origin}/pricing`,
    },
    siblings: family.map((f) => ({
      rel: "sibling",
      name: f.name,
      origin: f.origin,
      ...(f.role !== undefined && { role: f.role }),
      ...(f.llms !== undefined && { llms: f.llms }),
      ...(f.card !== undefined && { card: f.card }),
      ...(f.seams.length > 0 && { seams: f.seams }),
    })),
  };
}
