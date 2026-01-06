"use client";

import * as React from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

function cn(...inputs: Array<string | undefined | null | false>) {
  return twMerge(clsx(inputs));
}

export type ChartPoint = { timestamp: string; price: number };

export type ChartComponentProps = {
  title: string;
  subtitle?: string;
  data: ChartPoint[];
  className?: string;
};

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function formatTimeLabel(iso: string) {
  const d = new Date(iso);
  // compact label (mobile-friendly)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:00`;
}

export default function ChartComponent({ title, subtitle, data, className }: ChartComponentProps) {
  const trend = React.useMemo(() => {
    if (data.length < 2) return "flat" as const;
    const first = data[0]?.price ?? 0;
    const last = data[data.length - 1]?.price ?? 0;
    if (last > first) return "up" as const;
    if (last < first) return "down" as const;
    return "flat" as const;
  }, [data]);

  const stroke = trend === "down" ? "#ef4444" : trend === "up" ? "#22c55e" : "#a3a3a3";
  const fill = trend === "down" ? "rgba(239,68,68,0.20)" : trend === "up" ? "rgba(34,197,94,0.18)" : "rgba(163,163,163,0.15)";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border",
        "bg-white/70 dark:bg-neutral-950/55 border-black/5 dark:border-white/10",
        "backdrop-blur-xl shadow-[0_10px_30px_-15px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/60 via-white/20 to-transparent dark:from-white/10 dark:via-white/5 opacity-80" />
      <div className="relative p-4">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {title}
            </div>
            {subtitle ? (
              <div className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</div>
            ) : null}
          </div>

          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {data.length ? `${formatNumber(data[data.length - 1].price)}` : "—"}
          </div>
        </div>

        <div className="mt-3 h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTimeLabel}
                minTickGap={32}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={54}
                tickFormatter={(v) => formatNumber(Number(v))}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.06)",
                  background: "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(12px)",
                }}
                labelFormatter={(label) => new Date(label).toLocaleString()}
                formatter={(value) => [formatNumber(Number(value)), "Price"]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={stroke}
                strokeWidth={2}
                fill="url(#priceFill)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
          Trend:{" "}
          <span className="font-medium" style={{ color: stroke }}>
            {trend.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
