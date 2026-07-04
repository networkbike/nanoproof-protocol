import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "https://nanoproof-api-production.up.railway.app";

/**
 * Onboard endpoint — calls the backend to create or update the user record
 * after OTP verification. The web layer is a thin proxy so the client
 * never needs to know the api's internal endpoints.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.email || !body.role) {
      return NextResponse.json({ ok: false, error: "email and role required" }, { status: 400 });
    }
    if (!["creator", "supporter"].includes(body.role)) {
      return NextResponse.json({ ok: false, error: "role must be creator or supporter" }, { status: 400 });
    }
    const r = await fetch(`${API}/auth/onboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to onboard" },
      { status: 500 },
    );
  }
}
