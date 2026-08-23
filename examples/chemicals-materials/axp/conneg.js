/**
 * conneg.js — the estate conneg law (CONTEXT.md, ruled 2026-07-31), which is
 * also normative AXP 0.4.0 Clause 3 / Appendix A.7: three faces of every
 * dereferenceable address — HTML (the page), JSON (the typed body, SHOULD be
 * JSON-LD), markdown (the token-cheap agent register) — selected
 * deterministically, first match wins:
 *
 *   1. the ADDRESS forces  (.html / .json / .md face extensions)
 *   2. the ACCEPT header infers (q-values; application/* names JSON;
 *      text/* is treated as * / *; q=0 excludes; tie → earliest in header)
 *   3. CLIENT-CLASS defaults on a wildcard/absent Accept:
 *        browser navigation (Sec-Fetch-*, NEVER UA sniffing) → HTML
 *        known agent User-Agent (A.7.4 token list)           → markdown
 *        everything else, bare curl included                 → JSON
 *
 * Every face response advertises both sibling faces via Link rel="alternate"
 * (A.7.5), declares its face in Content-Type, sends Vary so caches never
 * cross-serve faces, answers HEAD wherever GET answers, and never 406s.
 *
 * Extracted and generalized from what epcis.dev (worker.js md twins), the
 * barcoding.dev engine (src/resolver/conneg.js) and the barcoding.dev site
 * worker (faceQ) already do — built once here, used by every property.
 */

export const FACES = Object.freeze(["html", "json", "md"]);

export const FACE_CONTENT_TYPE = Object.freeze({
  html: "text/html; charset=utf-8",
  json: "application/json; charset=utf-8",
  md: "text/markdown; charset=utf-8",
});

export const FACE_MEDIA_TYPE = Object.freeze({
  html: "text/html",
  json: "application/json",
  md: "text/markdown",
});

const EXT_FACE = Object.freeze({ ".html": "html", ".json": "json", ".md": "md" });

/** A.7.4 — the MUST-minimum known-agent User-Agent tokens (case-insensitive
 *  substring; `agent` intentionally matches any self-identifying *-Agent/*). */
export const AGENT_UA_TOKENS = Object.freeze([
  "gptbot",
  "chatgpt-user",
  "oai-searchbot",
  "claudebot",
  "claude-user",
  "claude-searchbot",
  "perplexitybot",
  "perplexity-user",
  "mistralai-user",
  "duckassistbot",
  "bingbot-chat",
  "agent",
]);

/** House extension (MAY, barcoding.dev precedent): link-unfurl scrapers send
 *  Accept: * / * with no Sec-Fetch-*, and the HTML face is the only face
 *  carrying the OG tags a card is built from. */
export const UNFURL_UA_TOKENS = Object.freeze([
  "facebookexternalhit",
  "twitterbot",
  "slackbot",
  "discordbot",
  "whatsapp",
  "linkedinbot",
  "telegrambot",
  "applebot",
  "pinterestbot",
  "skypeuripreview",
]);

/** A.7.3 rule 2 — SHOULD-send Vary so caches never cross-serve faces. */
export const CONNEG_VARY = "Accept, Sec-Fetch-Mode, Sec-Fetch-Dest, User-Agent";

/** A.7.2 — face-extension detection. Only .html/.json/.md force; anything
 *  else is an ordinary path with no face semantics. */
export function faceFromExtension(pathname) {
  for (const [ext, face] of Object.entries(EXT_FACE)) {
    if (pathname.endsWith(ext)) return { face, cleanPath: pathname.slice(0, -ext.length) };
  }
  return null;
}

/**
 * A.7.3 step 2 — the Accept header infers a face. Returns "html"|"json"|"md"
 * or null when no face media type is (effectively) named: * / * , absent,
 * only q=0 / unrecognized types, or text/* (names more than one face).
 * Highest q wins; tie → the face whose media type appears earliest.
 */
export function faceFromAccept(accept) {
  if (!accept) return null;
  const best = { html: null, json: null, md: null }; // { q, idx }
  const parts = accept.split(",");
  for (let i = 0; i < parts.length; i++) {
    const segs = parts[i].split(";");
    const type = segs[0].trim().toLowerCase();
    let q = 1;
    for (let j = 1; j < segs.length; j++) {
      const m = /^\s*q\s*=\s*([0-9]*\.?[0-9]+)/i.exec(segs[j]);
      if (m) q = parseFloat(m[1]);
    }
    if (!(q > 0)) continue; // q=0 excludes
    let face = null;
    if (type === "text/html") face = "html";
    else if (type === "application/json" || type === "application/ld+json") face = "json";
    else if (type === "text/markdown") face = "md";
    else if (type === "application/*") face = "json"; // exactly-one-face wildcard
    // text/* names more than one face → treated as */*; anything else ignored
    if (face === null) continue;
    if (best[face] === null || q > best[face].q) best[face] = { q, idx: i };
  }
  let chosen = null;
  for (const face of FACES) {
    const b = best[face];
    if (b === null) continue;
    if (chosen === null || b.q > chosen.q || (b.q === chosen.q && b.idx < chosen.idx)) {
      chosen = { face, q: b.q, idx: b.idx };
    }
  }
  return chosen ? chosen.face : null;
}

/** A.7.3 step 3 — the client-class defaults. Browser detection MUST use
 *  Sec-Fetch-* and MUST NOT be inferred from the User-Agent. */
export function faceFromClientClass(request, { unfurlHtml = true } = {}) {
  const mode = request.headers.get("sec-fetch-mode");
  const dest = request.headers.get("sec-fetch-dest");
  if (mode === "navigate" || dest === "document" || dest === "iframe") return "html";
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  if (unfurlHtml && UNFURL_UA_TOKENS.some((t) => ua.includes(t))) return "html";
  if (AGENT_UA_TOKENS.some((t) => ua.includes(t))) return "md";
  return "json";
}

/**
 * The selection algorithm (A.7.3), total and deterministic — never 406.
 * Returns { face, cleanPath, via } where via ∈ "address"|"accept"|"client-class".
 */
export function negotiate(request, pathname, opts = {}) {
  const forced = faceFromExtension(pathname);
  if (forced) return { ...forced, via: "address" };
  const inferred = faceFromAccept(request.headers.get("accept"));
  if (inferred) return { face: inferred, cleanPath: pathname, via: "accept" };
  return { face: faceFromClientClass(request, opts), cleanPath: pathname, via: "client-class" };
}

/** A.7.2 — the canonical face address of a clean path ("/" and directory-like
 *  paths advertise concrete /index.* siblings). */
export function faceAddress(cleanPath, face) {
  const ext = face === "html" ? "html" : face === "json" ? "json" : "md";
  if (cleanPath.endsWith("/")) return `${cleanPath}index.${ext}`;
  return `${cleanPath}.${ext}`;
}

/**
 * A.7.5 — the Link header advertising sibling faces. By default advertises
 * ALL THREE addresses (a self-referencing alternate is permitted; what is
 * required is that both siblings are advertised).
 * `addresses` may override the canonical extension convention per face.
 */
export function linkAlternates(cleanPath, { faces = FACES, addresses } = {}) {
  return faces
    .map((f) => {
      const href = (addresses && addresses[f]) || faceAddress(cleanPath, f);
      return `<${href}>; rel="alternate"; type="${FACE_MEDIA_TYPE[f]}"`;
    })
    .join(", ");
}

/** Resolve one face's content: a string/object, or a (request, url) function
 *  returning string | object | Response (sync or async). */
async function resolveFaceBody(source, request, url) {
  const v = typeof source === "function" ? await source(request, url) : source;
  return v;
}

/**
 * serveFace — build the Response for one selected face of a resource.
 *
 *   faces: { html?, json?, md? } — string | object (json) | (request, url) =>
 *          string | object | Response. A missing face 404s (A.7.2: a face
 *          address never falls back to a differently-faced sibling).
 *
 * Sets Content-Type, Link rel="alternate" (both siblings), Vary; answers
 * HEAD with the same status/headers and no body; never 406s.
 */
export async function serveFace(request, url, faces, face, { cleanPath, status = 200, headers, addresses } = {}) {
  const clean = cleanPath ?? url.pathname;
  const source = faces[face];
  const baseHeaders = {
    link: linkAlternates(clean, { faces: FACES.filter((f) => faces[f] !== undefined), addresses }),
    vary: CONNEG_VARY,
    ...(headers || {}),
  };
  if (source === undefined) {
    return new Response(request.method === "HEAD" ? null : JSON.stringify({ type: "EMPTY", results: [], message: "no such face of this resource" }), {
      status: 404,
      headers: { "content-type": FACE_CONTENT_TYPE.json, vary: CONNEG_VARY },
    });
  }
  const body = await resolveFaceBody(source, request, url);
  if (body instanceof Response) {
    // a site-supplied renderer already built the Response (e.g. env.ASSETS);
    // stamp the conneg headers on it without touching the body
    const h = new Headers(body.headers);
    for (const [k, v] of Object.entries(baseHeaders)) h.set(k, v);
    if (!h.get("content-type")) h.set("content-type", FACE_CONTENT_TYPE[face]);
    return new Response(request.method === "HEAD" ? null : body.body, { status: body.status, headers: h });
  }
  const text = face === "json" && typeof body !== "string" ? JSON.stringify(body, null, 2) : String(body);
  return new Response(request.method === "HEAD" ? null : text, {
    status,
    headers: { "content-type": FACE_CONTENT_TYPE[face], ...baseHeaders },
  });
}

/**
 * serveNegotiated — the whole law for one resource in one call: negotiate
 * (address > Accept > client class), then serve that face with alternates.
 */
export async function serveNegotiated(request, url, faces, opts = {}) {
  const { face, cleanPath } = negotiate(request, url.pathname, opts);
  return serveFace(request, url, faces, face, { ...opts, cleanPath });
}
