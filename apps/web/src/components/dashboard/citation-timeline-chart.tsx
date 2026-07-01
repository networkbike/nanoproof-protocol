"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { TimeBucket } from "@nanoproof/shared/schemas/analytics";

/**
 * Citation timeline — area chart, Recharts SVG renderer.
 * Pure client component (Recharts uses ResizeObserver).
 */
export function CitationTimelineChart({ data }: { data: TimeBucket[] }) {
  // Recharts wants plain objects with stable keys
  const points = data.map((d) => ({
    bucket: d.bucket,
    count: d.count,
    // ISO timestamp shortened to MM/DD for x-axis ticks
    label: new Date(d.bucket).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));

  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No data in this range yet.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="citeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(238 80% 65%)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="hsl(238 80% 65%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(240 5% 90%)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid hsl(240 5% 90%)",
              background: "hsl(0 0% 100%)",
            }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="hsl(238 80% 65%)"
            strokeWidth={2}
            fill="url(#citeGrad)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}