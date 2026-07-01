import { NextResponse } from "next/server";

/**
 * Web-side health endpoint — used by Vercel for the deployment
 * health check. Forwards to the api's /health so the dashboard
 * knows when the backend is down.
 *
 * Returns 200 if the api is reachable, 503 otherwise.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      // No cache — every probe should hit the api fresh.
      cache: "no-store",
      // Short timeout — health checks should fail fast.
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json(
        { ok: true, api: body },
        { status: 200 },
      );
    }
    return NextResponse.json(
      { ok: false, status: res.status },
      { status: 503 },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 503 },
    );
  }
}