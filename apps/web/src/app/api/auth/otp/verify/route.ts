/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "https://nanoproof-api-production.up.railway.app";

/**
 * Verify the OTP and issue a session token.
 *
 * PRODUCTION ONLY. No web-layer demo fallback. The backend must be
 * reachable and must have a configured email provider.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) {
      return NextResponse.json({ ok: false, error: "Email and OTP are required" }, { status: 400 });
    }
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json({ ok: false, error: "OTP must be 6 digits" }, { status: 400 });
    }

    let r: Response;
    try {
      r = await fetch(`${API}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
        cache: "no-store",
      });
    } catch (e) {
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication service unreachable.",
          hint: "Wait 2-3 minutes for Railway to restart the backend if this is a fresh deploy.",
        },
        { status: 503 },
      );
    }

    if (!r.ok) {
      const text = await r.text();
      let parsed: any = {};
      try { parsed = JSON.parse(text); } catch { /* not JSON */ }
      return NextResponse.json(
        {
          ok: false,
          error: parsed?.error || parsed?.message || `Verification failed (HTTP ${r.status})`,
        },
        { status: r.status },
      );
    }

    const data = await r.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to verify OTP" },
      { status: 500 },
    );
  }
}