/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "https://nanoproof-api-production.up.railway.app";

/**
 * Generate a 6-digit OTP and dispatch via the backend.
 *
 * PRODUCTION ONLY. There is no web-layer demo fallback.
 * If the backend is unreachable, we surface a clear error explaining
 * which Railway environment variables need to be configured.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    let r: Response;
    try {
      r = await fetch(`${API}/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        cache: "no-store",
      });
    } catch (e) {
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication service unreachable. The backend may be down or still deploying.",
          hint: "If this is the first deploy, wait 2-3 minutes for Railway to restart. Otherwise check Railway logs for the nanoproof-api service.",
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
          error: parsed?.error || parsed?.message || `Backend rejected the request (HTTP ${r.status})`,
          hint: parsed?.hint || "Check that RESEND_API_KEY, EMAIL_FROM, and JWT_SECRET are set on the nanoproof-api service in Railway.",
        },
        { status: r.status },
      );
    }

    const data = await r.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to send OTP" },
      { status: 500 },
    );
  }
}