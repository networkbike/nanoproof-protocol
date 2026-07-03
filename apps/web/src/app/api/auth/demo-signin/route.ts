/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Hackathon demo sign-in — for Lepton judges.
 *
 * Mints a session token without email OTP, so judges can sign in
 * instantly without needing Resend to send to arbitrary emails.
 *
 * Optional payload: { role: "creator" | "supporter" }
 * Defaults to "creator".
 *
 * This endpoint is intentionally unauthenticated — it's a demo
 * shortcut for the hackathon. In production it would be removed
 * or gated behind an admin role.
 */
export async function POST(req: NextRequest) {
  let role: "creator" | "supporter" = "creator";
  let name: string = "Demo Judge";
  let email: string = "judge@lepton.demo";

  try {
    const body = await req.json();
    if (body?.role === "supporter" || body?.role === "creator") {
      role = body.role;
    }
    if (typeof body?.name === "string" && body.name.length > 0 && body.name.length < 80) {
      name = body.name;
    }
    if (typeof body?.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      email = body.email;
    }
  } catch {
    // No body, use defaults
  }

  const now = Date.now();
  const exp = now + 24 * 60 * 60 * 1000; // 24h session for judges
  const userId = "usr_demo_" + Math.random().toString(36).slice(2, 18);
  const token = `demo.${Buffer.from(email).toString("base64url")}.${now}`;

  return NextResponse.json({
    ok: true,
    session: {
      token,
      email,
      name,
      role,
      userId,
      expiresAt: new Date(exp).toISOString(),
      issuedAt: new Date(now).toISOString(),
    },
  });
}