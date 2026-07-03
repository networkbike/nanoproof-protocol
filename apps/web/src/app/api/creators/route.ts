/**
 * GET /api/creators — proxy to api's /v1/creators for the payments page.
 */

import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const resp = await fetch(`${API_BASE}/v1/creators`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!resp.ok) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }
    const body = (await resp.json()) as { data?: unknown[] };
    return NextResponse.json({ data: body.data ?? [] });
  } catch {
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}