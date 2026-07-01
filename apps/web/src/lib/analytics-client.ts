// =============================================================================
// Analytics API client (apps/web → apps/api)
//
// Reads the analytics endpoints added in Phase 6. All requests forward the
// caller's `Authorization: Bearer np_...` header so the api can resolve
// scopes. Server components fetch directly (no HTTP roundtrip); client
// components fetch via /api/analytics/* proxy routes that re-attach the
// cookie.
//
// Shape mirrors the Zod schemas in packages/shared/schemas/analytics.
// =============================================================================

import "server-only";
import { headers } from "next/headers";
import type {
  CitationListResponse,
  CitationTimeSeries,
  CreatorAnalytics,
  CreatorListResponse,
  DemoSeedResult,
  OverviewKpi,
  PaymentListResponse,
  ProtocolAnalytics,
  TopCreator,
  TopDomain,
  TopSource,
} from "@nanoproof/shared/schemas/analytics";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      // Forward the cookie so the api can read the API key
      cookie,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Analytics ${path} → ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export const analytics = {
  overview: () => fetchJSON<OverviewKpi>("/v1/analytics/overview"),
  creators: (limit = 50) => fetchJSON<CreatorListResponse>(`/v1/analytics/creators?limit=${limit}`),
  topCreators: (limit = 10) => fetchJSON<TopCreator[]>(`/v1/analytics/top-creators?limit=${limit}`),
  creator: (id: string) => fetchJSON<CreatorAnalytics>(`/v1/analytics/creator/${id}`),
  citations: (q?: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    if (q) {
      for (const [k, v] of Object.entries(q)) {
        if (v !== undefined && v !== "") params.set(k, String(v));
      }
    }
    return fetchJSON<CitationListResponse>(`/v1/analytics/citations?${params.toString()}`);
  },
  topSources: (limit = 10) => fetchJSON<TopSource[]>(`/v1/analytics/citations/top-sources?limit=${limit}`),
  topDomains: (limit = 10) => fetchJSON<TopDomain[]>(`/v1/analytics/citations/top-domains?limit=${limit}`),
  citationTimeline: (range: "24h" | "7d" | "30d" | "90d" | "all" = "30d") =>
    fetchJSON<CitationTimeSeries>(`/v1/analytics/citations/timeline?range=${range}`),
  payments: (q?: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    if (q) {
      for (const [k, v] of Object.entries(q)) {
        if (v !== undefined && v !== "") params.set(k, String(v));
      }
    }
    return fetchJSON<PaymentListResponse>(`/v1/analytics/payments?${params.toString()}`);
  },
  paymentTimeline: (range: "24h" | "7d" | "30d" | "90d" | "all" = "30d") =>
    fetchJSON<CitationTimeSeries>(`/v1/analytics/payments/timeline?range=${range}`),
  protocol: () => fetchJSON<ProtocolAnalytics>("/v1/analytics/protocol"),
};

// Demo seed needs ADMIN scope. Called from the dashboard's "Load Demo
// Dataset" button (a client component that hits /api/analytics/demo-seed).
export async function seedDemoDatasetServerSide(input: {
  creators?: number;
  sources?: number;
  citations?: number;
  payments?: number;
}): Promise<DemoSeedResult> {
  return fetchJSON<DemoSeedResult>("/v1/analytics/demo/seed", {
    method: "POST",
    body: JSON.stringify(input),
  });
}