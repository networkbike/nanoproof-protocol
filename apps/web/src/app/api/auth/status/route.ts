import { NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "https://nanoproof-api-production.up.railway.app";

export async function GET() {
  try {
    const r = await fetch(`${API}/auth/status`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!r.ok) {
      return NextResponse.json({ configured: false, provider: "demo" });
    }
    return NextResponse.json(await r.json());
  } catch {
    // Friendly default: assume demo mode
    return NextResponse.json({ configured: false, provider: "demo", mode: "fallback" });
  }
}