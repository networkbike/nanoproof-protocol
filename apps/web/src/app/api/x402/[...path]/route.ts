/**
 * Generic catch-all proxy for /api/x402/* → api /<path>
 *
 * Works for any x402 endpoint: /api/x402/metrics, /api/x402/demo, /api/x402/payments/settle,
 * /api/x402/payments/history, /api/x402/payments/proof/123, /api/x402/creators/alice/revenue,
 * /api/x402/supporters, etc.
 *
 * The browser hits /api/x402/* (same-origin) and we forward to
 * process.env.NEXT_PUBLIC_API_URL/<path> server-to-server (no CORS).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "https://nanoproof-api-production.up.railway.app";

async function forward(req: NextRequest): Promise<Response> {
  const path = req.nextUrl.pathname.replace(/^\/api\/x402\//, "");
  const search = req.nextUrl.search;
  const targetUrl = `${API}/${path}${search}`;

  // Forward body for POST/PUT/PATCH
  const isReadOnly = req.method === "GET" || req.method === "HEAD";
  const body = isReadOnly ? undefined : await req.text();

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    const text = await upstream.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    return NextResponse.json(data, { status: upstream.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Proxy failed" },
      { status: 502 },
    );
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
