"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORS: Record<string, string> = {
  SETTLED: "hsl(142 71% 45%)",
  PENDING: "hsl(38 92% 50%)",
  QUOTED: "hsl(217 91% 60%)",
  CAPPED: "hsl(280 65% 60%)",
  FAILED: "hsl(0 84% 60%)",
};

export function PaymentStatusDonut({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (total === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No payments yet.
      </div>
    );
  }
  const data = entries.map(([status, count]) => ({
    name: status,
    value: count,
    pct: ((count / total) * 100).toFixed(1),
  }));

  return (
    <div className="flex h-64 flex-col items-center justify-center">
      <div className="relative h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={50}
              outerRadius={75}
              paddingAngle={2}
              dataKey="value"
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={COLORS[d.name] ?? "hsl(240 5% 65%)"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid hsl(240 5% 90%)",
                background: "hsl(0 0% 100%)",
              }}
              formatter={(v, n) => [`${v} (${(((v as number) / total) * 100).toFixed(1)}%)`, n as string]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold">{total}</span>
          <span className="text-xs text-muted-foreground">payments</span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">
        {data.map((d) => (
          <div key={d.name} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: COLORS[d.name] ?? "#888" }}
            />
            {d.name}
          </div>
        ))}
      </div>
    </div>
  );
}