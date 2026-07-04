import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "https://nanoproof-api-production.up.railway.app";

/**
 * Web-side proxy for the api's x402 demo endpoint.
 *
 * Goes through this proxy (same-origin) instead of a direct browser→api
 * fetch so we sidestep CORS / cross-origin-resource-policy entirely.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const r = await fetch(`${API}/x402/demo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to call x402 demo" },
      { status: 502 },
    );
  }
}
