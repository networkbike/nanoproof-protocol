/**
 * Generic catch-all proxy for /api/x402/* → api /<path>
 *
 * For most endpoints (/metrics, /supporters, /payments/*, /creators/*),
 * the browser hit path mirrors the api path exactly. The only special
 * case is /demo — the api serves it at /x402/demo (with prefix) not /demo.
 *
 * The browser hits /api/x402/* (same-origin) and we forward to
 * process.env.NEXT_PUBLIC_API_URL/<path> server-to-server (no CORS).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "https://nanoproof-api-production.up.railway.app";

// Some routes live under /x402/ on the api rather than at root.
const X402_PREFIXED: Record<string, true> = {
  demo: true,
};

async function forward(req: NextRequest): Promise<Response> {
  const tail = req.nextUrl.pathname.replace(/^\/api\/x402\//, "");
  const search = req.nextUrl.search;
  const first = tail.split("/")[0];
  const targetPath = X402_PREFIXED[first] ? `/x402/${tail}` : `/${tail}`;
  const targetUrl = `${API}${targetPath}${search}`;

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
