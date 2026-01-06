import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Period = "1D" | "1W" | "1M" | "1Y";
type Currency = "usd" | "eur" | "gold" | "coin";

const PERIODS: Record<Period, { ms: number; mode: "raw" | "hour" | "sixHour" | "day" }> = {
  "1D": { ms: 24 * 60 * 60 * 1000, mode: "raw" },
  "1W": { ms: 7 * 24 * 60 * 60 * 1000, mode: "hour" },
  "1M": { ms: 30 * 24 * 60 * 60 * 1000, mode: "sixHour" },
  "1Y": { ms: 365 * 24 * 60 * 60 * 1000, mode: "day" },
};

function normalizeCurrency(input: string | null): Currency | null {
  if (!input) return null;
  const v = input.trim().toLowerCase();
  if (v === "dollar") return "usd";
  if (v === "euro") return "eur";
  if (v === "emami") return "coin";
  if (v === "usd" || v === "eur" || v === "gold" || v === "coin") return v;
  return null;
}

function normalizePeriod(input: string | null): Period {
  const v = (input ?? "").trim().toUpperCase();
  return (v === "1D" || v === "1W" || v === "1M" || v === "1Y") ? (v as Period) : "1D";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const currency = normalizeCurrency(searchParams.get("currency"));
    const period = normalizePeriod(searchParams.get("period"));

    if (!currency) {
      return NextResponse.json(
        { ok: false, error: "Invalid currency. Use usd|eur|gold|coin (or aliases: dollar|euro|emami)" },
        { status: 400 }
      );
    }

    const { ms, mode } = PERIODS[period];
    const startIso = new Date(Date.now() - ms).toISOString();

    const current = await sql<{ price: number; created_at: string }>`
      SELECT price, created_at::text AS created_at
      FROM prices
      WHERE currency = ${currency}
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const current_price = current.rows[0]?.price ?? null;
    const current_timestamp = current.rows[0]?.created_at ?? null;

    type Row = { t: string; price: number };
    let rows: Row[] = [];

    if (mode === "raw") {
      const res = await sql<{ created_at: string; price: number }>`
        SELECT created_at::text AS created_at, price
        FROM prices
        WHERE currency = ${currency}
          AND created_at >= ${startIso}::timestamptz
        ORDER BY created_at ASC;
      `;
      rows = res.rows.map((r) => ({ t: r.created_at, price: r.price }));
    } else if (mode === "hour") {
      const res = await sql<{ bucket: string; price: number }>`
        SELECT date_trunc('hour', created_at)::text AS bucket,
               ROUND(AVG(price))::int AS price
        FROM prices
        WHERE currency = ${currency}
          AND created_at >= ${startIso}::timestamptz
        GROUP BY bucket
        ORDER BY bucket ASC;
      `;
      rows = res.rows.map((r) => ({ t: r.bucket, price: r.price }));
    } else if (mode === "sixHour") {
      const res = await sql<{ bucket: string; price: number }>`
        SELECT date_bin(INTERVAL '6 hours', created_at, TIMESTAMPTZ '1970-01-01')::text AS bucket,
               ROUND(AVG(price))::int AS price
        FROM prices
        WHERE currency = ${currency}
          AND created_at >= ${startIso}::timestamptz
        GROUP BY bucket
        ORDER BY bucket ASC;
      `;
      rows = res.rows.map((r) => ({ t: r.bucket, price: r.price }));
    } else {
      const res = await sql<{ bucket: string; price: number }>`
        SELECT date_trunc('day', created_at)::text AS bucket,
               ROUND(AVG(price))::int AS price
        FROM prices
        WHERE currency = ${currency}
          AND created_at >= ${startIso}::timestamptz
        GROUP BY bucket
        ORDER BY bucket ASC;
      `;
      rows = res.rows.map((r) => ({ t: r.bucket, price: r.price }));
    }

    return NextResponse.json(
      {
        ok: true,
        currency,
        period,
        current_price,
        current_timestamp,
        chart_data: rows.map((r) => ({ timestamp: new Date(r.t).toISOString(), price: r.price })),
      },
      {
        status: 200,
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
