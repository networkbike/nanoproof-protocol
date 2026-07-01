import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Server-side proxy: forwards the caller's API key to the api.
// The api requires ADMIN scope + NANOPROOF_DEMO_MODE=true to honor this.

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const apiKey = cookieStore.get("np_api_key")?.value;
  if (!apiKey) {
    return NextResponse.json(
      { code: "NP_AUTH_FAILED", message: "Missing API key cookie." },
      { status: 401 },
    );
  }

  const body = await req.text();
  const res = await fetch(`${API_BASE}/v1/analytics/demo/seed`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body,
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}