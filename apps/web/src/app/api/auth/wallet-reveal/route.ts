import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "https://nanoproof-api-production.up.railway.app";

/** POST /api/auth/wallet-reveal — calls the api's wallet-reveal */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.email) {
      return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
    }
    const r = await fetch(`${API}/auth/wallet-reveal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email }),
      cache: "no-store",
    });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 502 });
  }
}
