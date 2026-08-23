/**
 * mcp.js — the MCP door (POST /mcp, JSON-RPC 2.0, streamable-http). One
 * definition: every tool answers from the SAME manifest/seed the HTTP doors
 * serve — the tools are the HTTP Nouns and verbs, not a second API (§3.3).
 *
 * Auth per the batch-2 ruling: sandbox READ tools are AUTHLESS (the
 * anon-sandbox rung); the payable tools (pull_credit_file,
 * submit_origination) require a bearer key — without one they answer a
 * typed BLOCKED result; with one they answer the same typed 402-shaped
 * OFFER the HTTP doors serve (wave-zero labeled stub, no live settlement).
 */

import { collectionDecision } from "./axp/index.js";
import { manifest } from "./manifest.js";
import { pricingDoc } from "./bridge.js";
import { loans, getLoan, creditFiles, getCreditFile, lenders, getPaymentMessage } from "./seed.js";

const PROTOCOL_VERSION = "2025-06-18";

const PAYABLE_TOOLS = new Set(["pull_credit_file", "submit_origination"]);

function toolResult(id, payload) {
  return {
    jsonrpc: "2.0",
    id,
    result: { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] },
  };
}

function rpcError(id, code, message) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

export function buildTools() {
  return [
    {
      name: "search_payment_messages",
      description:
        "Search the ISO 20022 payment messages (the same /payment-messages collection): type = message type prefix (pain.001 | pacs.008 | camt.053), period = YYYY-MM. Typed OK | EMPTY | BLOCKED result over labeled example data.",
      inputSchema: { type: "object", properties: { type: { type: "string" }, period: { type: "string" } } },
    },
    {
      name: "get_payment_message",
      description: "One ISO 20022 payment message by id — same records as GET /payment-messages/{id}.",
      inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    },
    {
      name: "list_loans",
      description: "The loans visible to this caller (labeled example loans, door grain) — same as GET /loans.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_loan",
      description: "One loan with its amortization schedule to date — same as GET /loans/{id}.",
      inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    },
    {
      name: "list_credit_files",
      description: "Commercial credit files (the records floor; labeled example files) — same as GET /credit-files.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_credit_file",
      description: "One credit file with tradelines tied to the loan corpus — same as GET /credit-files/{id}.",
      inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    },
    {
      name: "list_lenders",
      description: "Lender/product market records (labeled synthetic) — same as GET /lenders.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_pricing",
      description: "The Pricing Document with its operation-keyed top-level rates[] — same document as GET /pricing.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "pull_credit_file",
      description:
        "PAYABLE (bearer key required): pull a consented commercial credit file — same door as POST /credit-files/pulls. Wave-zero labeled stub: answers a typed OFFER; no live settlement, no pull is performed.",
      inputSchema: { type: "object", properties: { subject: { type: "string" } }, required: ["subject"] },
    },
    {
      name: "submit_origination",
      description:
        "PAYABLE (bearer key required): submit a loan origination for routing to a licensed Lender — same door as POST /originations. Wave-zero labeled stub: answers a typed OFFER; no live settlement, nothing is routed.",
      inputSchema: {
        type: "object",
        properties: { borrower: { type: "string" }, amount: { type: "number" }, product: { type: "string" } },
        required: ["borrower", "amount"],
      },
    },
  ];
}

function callTool(name, args = {}, { hasBearer }) {
  if (PAYABLE_TOOLS.has(name) && !hasBearer) {
    return {
      type: "BLOCKED",
      reason:
        `tool '${name}' is a payable door and requires a bearer key (Authorization: Bearer …) — sandbox read tools are ` +
        "authless; keys are not self-served at wave zero, so this rung is documented but gated",
    };
  }
  switch (name) {
    case "search_payment_messages": {
      const params = new URLSearchParams();
      if (args.type) params.set("type", String(args.type));
      if (args.period) params.set("period", String(args.period));
      return collectionDecision(manifest, params).body;
    }
    case "get_payment_message": {
      const rec = getPaymentMessage(String(args.id));
      return rec ? { type: "OK", messages: [rec] } : { type: "EMPTY", messages: [], message: `no payment message with id ${args.id}` };
    }
    case "list_loans":
      return { type: "OK", loans };
    case "get_loan": {
      const rec = getLoan(String(args.id));
      return rec ? { type: "OK", loan: rec } : { type: "EMPTY", loans: [], message: `no loan with id ${args.id}` };
    }
    case "list_credit_files":
      return { type: "OK", files: creditFiles };
    case "get_credit_file": {
      const rec = getCreditFile(String(args.id));
      return rec ? { type: "OK", file: rec } : { type: "EMPTY", files: [], message: `no credit file with id ${args.id}` };
    }
    case "list_lenders":
      return { type: "OK", lenders };
    case "get_pricing":
      return pricingDoc;
    case "pull_credit_file":
      return {
        type: "OFFER",
        ...manifest.pricing.offers[0],
        message:
          "Pulling a consented credit file is a payable door. Wave zero is test-mode: this OFFER is a labeled stub — " +
          "no billing occurs and no pull is performed. Alternatives list mounted rungs only.",
      };
    case "submit_origination":
      return {
        type: "OFFER",
        ...manifest.pricing.offers[0],
        message:
          "Origination submission is routed to a licensed Lender (the Lender, not this property, grants credit). " +
          "Wave zero is test-mode: this OFFER is a labeled stub — no billing occurs and nothing is routed. " +
          "Alternatives list mounted rungs only.",
      };
    default:
      return undefined;
  }
}

/** Handle one JSON-RPC message; null for notifications. */
export function handleMcpMessage(msg, ctx) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return rpcError(msg && msg.id, -32600, "invalid JSON-RPC 2.0 request");
  }
  const { id, method, params } = msg;
  if (id === undefined) return null; // notification
  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: "apis.finance", version: manifest.version },
        },
      };
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return { jsonrpc: "2.0", id, result: { tools: buildTools() } };
    case "tools/call": {
      const name = params && params.name;
      const result = callTool(name, (params && params.arguments) || {}, ctx);
      if (result === undefined) return rpcError(id, -32602, `unknown tool: ${name}`);
      return toolResult(id, result);
    }
    default:
      return rpcError(id, -32601, `method not found: ${method}`);
  }
}

/** The POST /mcp door. Returns a Response, or undefined when not /mcp. */
export async function mcpRoutes(request, url) {
  if (url.pathname !== "/mcp") return undefined;
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ type: "BLOCKED", reason: "the MCP door answers POST (JSON-RPC 2.0, streamable-http); GET has nothing to serve here" }),
      { status: 405, headers: { "content-type": "application/json; charset=utf-8", allow: "POST" } },
    );
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify(rpcError(null, -32700, "parse error: body must be JSON")), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  const auth = request.headers.get("authorization") || "";
  const ctx = { hasBearer: /^bearer\s+\S+/i.test(auth) };
  const responses = Array.isArray(body)
    ? body.map((m) => handleMcpMessage(m, ctx)).filter((r) => r !== null)
    : handleMcpMessage(body, ctx);
  if (responses === null || (Array.isArray(responses) && responses.length === 0)) {
    return new Response(null, { status: 202 });
  }
  return new Response(JSON.stringify(responses, null, 2), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
