import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Period = "1D" | "1W" | "1M" | "1Y";
type CanonicalCurrency = "usd" | "eur" | "gold" | "coin";

const PERIODS: Record<Period, { windowInterval: string; mode: "raw" | "hour" | "sixHour" | "day" }> = {
  "1D": { windowInterval: "24 hours", mode: "raw" },
  "1W": { windowInterval: "7 days", mode: "hour" },
  "1M": { windowInterval: "30 days", mode: "sixHour" },
  "1Y": { windowInterval: "365 days", mode: "day" },
};

function normalizeCurrency(input: string | null): CanonicalCurrency | null {
  if (!input) return null;
  const v = input.trim().toLowerCase();

  // aliases
  if (v === "dollar") return "usd";
  if (v === "euro") return "eur";
  if (v === "coin" || v === "emami") return "coin";

  if (v === "usd" || v === "eur" || v === "gold" || v === "coin") return v;
  return null;
}

function normalizePeriod(input: string | null): Period {
  const v = (input ?? "").trim().toUpperCase();
  return (v === "1D" || v === "1W" || v === "1M" || v === "1Y") ? (v as Period) : "1D";
}

function toISO(ts: unknown): string {
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === "string" || typeof ts === "number") return new Date(ts).toISOString();
  return new Date(String(ts)).toISOString();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const currency = normalizeCurrency(searchParams.get("currency"));
    const period = normalizePeriod(searchParams.get("period"));

    if (!currency) {
      return NextResponse.json(
        { ok: false, error: "Invalid currency. Use: usd|eur|gold|coin (or aliases: dollar|euro|emami)" },
        { status: 400 }
      );
    }

    const current = await sql<{ price: number; created_at: Date }>`
      SELECT price, created_at
      FROM prices
      WHERE currency = ${currency}
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const current_price = current.rows[0]?.price ?? null;
    const current_timestamp = current.rows[0]?.created_at ? toISO(current.rows[0].created_at) : null;

    const { windowInterval, mode } = PERIODS[period];

    let series:
      | Array<{ bucket: Date; price: number }>
      | Array<{ created_at: Date; price: number }>;

    if (mode === "raw") {
      const res = await sql<{ created_at: Date; price: number }>`
        SELECT created_at, price
        FROM prices
        WHERE currency = ${currency}
          AND created_at >= NOW() - INTERVAL ${windowInterval}
        ORDER BY created_at ASC;
      `;
      series = res.rows;
    } else if (mode === "hour") {
      const res = await sql<{ bucket: Date; price: number }>`
        SELECT
          date_trunc('hour', created_at) AS bucket,
          ROUND(AVG(price))::int AS price
        FROM prices
        WHERE currency = ${currency}
          AND created_at >= NOW() - INTERVAL ${windowInterval}
        GROUP BY bucket
        ORDER BY bucket ASC;
      `;
      series = res.rows;
    } else if (mode === "sixHour") {
      // date_bin is supported in modern Postgres (and is great for fixed buckets)
      const res = await sql<{ bucket: Date; price: number }>`
        SELECT
          date_bin(INTERVAL '6 hours', created_at, TIMESTAMPTZ '1970-01-01') AS bucket,
          ROUND(AVG(price))::int AS price
        FROM prices
        WHERE currency = ${currency}
          AND created_at >= NOW() - INTERVAL ${windowInterval}
        GROUP BY bucket
        ORDER BY bucket ASC;
      `;
      series = res.rows;
    } else {
      const res = await sql<{ bucket: Date; price: number }>`
        SELECT
          date_trunc('day', created_at) AS bucket,
          ROUND(AVG(price))::int AS price
        FROM prices
        WHERE currency = ${currency}
          AND created_at >= NOW() - INTERVAL ${windowInterval}
        GROUP BY bucket
        ORDER BY bucket ASC;
      `;
      series = res.rows;
    }

    const chart_data = series.map((r: any) => ({
      timestamp: toISO(r.bucket ?? r.created_at),
      price: Number(r.price),
    }));

    return NextResponse.json(
      {
        ok: true,
        currency,
        period,
        current_price,
        current_timestamp,
        chart_data,
      },
      {
        status: 200,
        headers: {
          // Helps mobile apps; tweak if you want “more live”
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
