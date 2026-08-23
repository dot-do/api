/**
 * openapi.js — the OpenAPI 3.1 contract (AXP Clause 1), assembled from the
 * SAME manifest the routes mount, so the contract cannot drift from the
 * service. LIVE-ONLY / presence-when-true: the only paths emitted are the
 * quartet the generator itself serves plus the manifest's own declared live
 * routes — never an aspirational endpoint.
 */

const ENVELOPE_SCHEMAS = {
  OkEnvelope: {
    type: "object",
    required: ["type"],
    properties: {
      type: { const: "OK" },
    },
    description:
      "200 — substantive content. The collection member name (results/items/events…) is this API's own choice, documented on the operation.",
  },
  EmptyEnvelope: {
    type: "object",
    required: ["type", "message"],
    properties: {
      type: { const: "EMPTY" },
      message: { type: "string" },
    },
    description: "200 — a truthful empty collection, never a bare [] masquerading as data.",
  },
  BlockedEnvelope: {
    type: "object",
    required: ["type", "reason"],
    properties: {
      type: { const: "BLOCKED" },
      reason: { type: "string" },
    },
    description: "401/403 — a permission boundary with a worded reason.",
  },
  OfferEnvelope: {
    type: "object",
    required: ["type"],
    properties: {
      type: { const: "OFFER" },
      id: { type: "string" },
      title: { type: "string" },
      price: {},
      checkoutUrl: { type: "string" },
      alternatives: { type: "array" },
    },
    description: "402 — a payment or ceiling re-authorization boundary; an offer to proceed, never a refusal.",
  },
  PricingDocument: {
    type: "object",
    required: ["model"],
    properties: {
      model: { enum: ["free", "metered"] },
      hardCeiling: { type: "number", exclusiveMinimum: 0 },
      unit: { type: "string" },
      price: { type: "number" },
      binding: {
        type: "boolean",
        description:
          "Whether published terms bind this price. `model` answers what it costs; `binding` answers whether you can hold us to it. Absent means not declared — never assume bound.",
      },
      statement: {
        type: "string",
        description: "Present when binding is false: the stated intent, in the same words the human pages use.",
      },
      termsUrl: {
        type: "string",
        description: "Present when binding is true: the terms document that binds this price.",
      },
      ledgerUrl: {
        type: "string",
        description: "Where the open item to bind this price is tracked.",
      },
    },
    description:
      'AXP Appendix A.2 — closed model "free" | "metered"; hardCeiling required and > 0 when metered. `binding` is a descriptive member on an axis orthogonal to `model`: binding: true carries termsUrl, binding: false carries statement.',
  },
};

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const jsonContent = (schema) => ({ "application/json": { schema } });

export function buildOpenapi(manifest) {
  const { origin, name, description, version, collection, pricing, routes, family, familyPath } = manifest;

  const collectionParams = [
    ...collection.filters.map((f) => ({
      name: f,
      in: "query",
      required: false,
      schema: { type: "string" },
      description: `filter the collection by ${f}; a non-matching value answers a typed 200 EMPTY, never a fake success`,
    })),
    {
      name: "scope",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: `reserved scopes (${collection.blockedScopes.join(", ")}) answer a typed 403 BLOCKED`,
    },
  ];
  if (pricing.model === "metered") {
    collectionParams.push({
      name: pricing.spendParam,
      in: "query",
      required: false,
      schema: { type: "number" },
      description: `requested spend in the same unit as hardCeiling (${pricing.hardCeiling}); above the ceiling answers a typed 402 OFFER re-authorization boundary`,
    });
  }

  const paths = {
    [collection.path]: {
      get: {
        operationId: "listCollection",
        summary: collection.summary,
        description:
          `The keyless, branching collection (AXP Clauses 4 + 7): plain GET answers 200 OK with substantive typed content to an anonymous caller; ` +
          `a non-matching filter answers 200 EMPTY; a reserved scope answers 403 BLOCKED. Collection member name: "${collection.memberName}".`,
        parameters: collectionParams,
        responses: {
          200: { description: "OK or EMPTY envelope", content: jsonContent({ oneOf: [ref("OkEnvelope"), ref("EmptyEnvelope")] }) },
          403: { description: "BLOCKED envelope", content: jsonContent(ref("BlockedEnvelope")) },
          ...(pricing.model === "metered" && {
            402: { description: "OFFER envelope — the hard-ceiling re-authorization boundary", content: jsonContent(ref("OfferEnvelope")) },
          }),
        },
      },
    },
    "/pricing": {
      get: {
        operationId: "getPricing",
        summary: "The Pricing Document (AXP Appendix A.2)",
        description:
          (pricing.model === "free"
            ? 'This API is free: {"model":"free"} — the declaration itself is the obligation (the no-ask-zone law).'
            : `This API is metered with a hard ceiling of ${pricing.hardCeiling}${pricing.unit ? ` (${pricing.unit})` : ""}; the caller can never be metered past it without explicit re-authorization.`) +
          (pricing.binding === false
            ? " This price is NOT bound by published terms: it is a stated intent, and the document says so in its `binding` and `statement` members. Budget against it; do not contract on it."
            : pricing.binding === true
              ? ` This price IS bound by published terms at ${pricing.termsUrl}.`
              : ""),
        responses: {
          200: { description: "the Pricing Document", content: jsonContent(ref("PricingDocument")) },
        },
      },
    },
  };

  if (family.length > 0) {
    paths[familyPath] = {
      get: {
        operationId: "getFamilyRegistry",
        summary: "The family registry — sibling properties and their seams as typed edges",
        description:
          "Lists the sibling doors of this property's family so an agent at this door discovers the others as contracts, not links.",
        responses: { 200: { description: "the family registry", content: jsonContent({ type: "object" }) } },
      },
    };
  }

  if (pricing.model === "metered") {
    paths[pricing.offerPath] = {
      get: {
        operationId: "getOffer",
        summary: "The offer boundary (AXP Appendix A.5)",
        description: "Always answers 402 with a typed OFFER body — the machine-readable start of the paid conversation.",
        responses: {
          402: { description: "OFFER envelope", content: jsonContent(ref("OfferEnvelope")) },
        },
      },
    };
  }

  for (const r of routes) {
    const method = r.method.toLowerCase();
    paths[r.path] = paths[r.path] || {};
    paths[r.path][method] = {
      summary: r.summary,
      ...(r.description !== undefined && { description: r.description }),
      ...(r.params.length > 0 && { parameters: r.params.map((p) => ({ in: "query", required: false, schema: { type: "string" }, ...p })) }),
      ...(r.requestBody !== undefined && { requestBody: r.requestBody }),
      responses: r.responses || { 200: { description: "OK" } },
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: name,
      version,
      description,
    },
    servers: [{ url: origin }],
    paths,
    components: { schemas: ENVELOPE_SCHEMAS },
  };
}
