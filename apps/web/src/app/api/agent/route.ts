import { NextResponse, type NextRequest } from "next/server";
import { research } from "@nanoproof/agent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * POST /api/agent — runs the full NanoProof research pipeline.
 *
 *   { question: string } → AgentAnswer
 *
 * The web app never sees the API key (when provided); the route handler
 * reads INTERNAL_API_KEY from the server-side env and forwards it to
 * the NanoProof API. In demo mode the API is hit anonymously, which is
 * fine for /v1/citations/detect (public) and /v1/payments/settle (public).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { question?: string; mode?: "live" | "offline" };
    const question = body.question?.trim() ?? "";
    if (question.length < 1) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }
    if (question.length > 2000) {
      return NextResponse.json({ error: "question too long (max 2000 chars)" }, { status: 400 });
    }

    const apiKey = process.env.INTERNAL_API_KEY;
    const result = await research(
      { text: question },
      {
        apiBaseUrl: API_URL,
        ...(apiKey ? { apiKey } : {}),
        mode: body.mode === "offline" ? "offline" : "live",
      },
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/agent] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
