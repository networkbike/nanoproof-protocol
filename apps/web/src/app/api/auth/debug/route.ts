import { NextResponse } from "next/server";

/**
 * Auth debug endpoint - shows what env vars are visible to the api
 * (since Railway proxies through the web layer).
 *
 * Useful for debugging OTP delivery issues.
 */
export async function GET() {
  return NextResponse.json({
    api_url: process.env.NEXT_PUBLIC_API_URL,
    env: {
      // Don't expose the actual key, just whether it's set
      AUTH_PROVIDER: process.env.AUTH_PROVIDER || null,
      RESEND_API_KEY_set: !!process.env.RESEND_API_KEY,
      OTP_API_KEY_set: !!process.env.OTP_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM || null,
      OTP_SENDER: process.env.OTP_SENDER || null,
      JWT_SECRET_set: !!process.env.JWT_SECRET,
    },
    timestamp: new Date().toISOString(),
  });
}
