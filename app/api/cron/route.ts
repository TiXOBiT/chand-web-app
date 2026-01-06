import { NextResponse } from "next/server";
import axios from "axios";
import { load } from "cheerio";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CanonicalCurrency = "usd" | "eur" | "gold" | "coin";

type BonbastJson = Record<string, unknown>;

function assertCronAuth(req: Request) {
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  // Recommended: Authorization: Bearer <CRON_SECRET>
  const ok = expected && auth === `Bearer ${expected}`;
  if (!ok) throw new Response("Unauthorized", { status: 401 });
}

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    if (!cleaned) return null;
    const n = Number.parseInt(cleaned, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const BASE_URL = "https://www.bonbast.com";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  Referer: `${BASE_URL}/`,
};

async function fetchBonbastJson(): Promise<BonbastJson> {
  const htmlRes = await axios.get<string>(`${BASE_URL}/`, {
    headers: BROWSER_HEADERS,
    timeout: 12_000,
    responseType: "text",
    validateStatus: (s) => s >= 200 && s < 400,
  });

  const html = htmlRes.data;

  // (Cheerio included) - sometimes the param is in script tags
  const $ = load(html);
  const scriptsText = $("script")
    .map((_, el) => $(el).text())
    .get()
    .join("\n");

  const haystack = `${html}\n${scriptsText}`;
  const match = haystack.match(/param:\s*"([^"]+)"/);

  if (!match?.[1]) {
    throw new Error("Bonbast param not found (site structure changed?)");
  }

  const param = match[1];

  const body = new URLSearchParams({ param });

  const jsonRes = await axios.post(`${BASE_URL}/json`, body.toString(), {
    headers: {
      ...BROWSER_HEADERS,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Origin: BASE_URL,
      Referer: `${BASE_URL}/`,
    },
    timeout: 12_000,
    responseType: "json",
    validateStatus: (s) => s >= 200 && s < 400,
  });

  if (!jsonRes.data || typeof jsonRes.data !== "object") {
    throw new Error("Invalid JSON response from Bonbast");
  }

  return jsonRes.data as BonbastJson;
}

function extractTrackedPrices(data: BonbastJson): Array<{ currency: CanonicalCurrency; price: number }> {
  // Common Bonbast /json keys:
  // usd1 (sell), eur1 (sell), gol18 (gold gram), emami1 (coin emami)
  const usd = toInt(data["usd1"]);
  const eur = toInt(data["eur1"]);
  const gold = toInt(data["gol18"]);
  const coin = toInt(data["emami1"]);

  const rows: Array<{ currency: CanonicalCurrency; price: number }> = [];

  if (usd !== null) rows.push({ currency: "usd", price: usd });
  if (eur !== null) rows.push({ currency: "eur", price: eur });
  if (gold !== null) rows.push({ currency: "gold", price: gold });
  if (coin !== null) rows.push({ currency: "coin", price: coin });

  return rows;
}

export async function GET(req: Request) {
  try {
    assertCronAuth(req);

    const bonbast = await fetchBonbastJson();
    const rows = extractTrackedPrices(bonbast);

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No prices extracted (keys missing?)" },
        { status: 502 }
      );
    }

    // Fixed-size bulk insert pattern (safe + simple). If a currency is missing, we skip it.
    // (Only 4 rows max per run, so this is efficient and avoids dynamic SQL building.)
    await sql`BEGIN`;

    for (const r of rows) {
      await sql`INSERT INTO prices (currency, price) VALUES (${r.currency}, ${r.price});`;
    }

    await sql`COMMIT`;

    return NextResponse.json(
      {
        ok: true,
        inserted: rows.length,
        prices: rows,
      },
      { status: 200 }
    );
  } catch (err) {
    try {
      await sql`ROLLBACK`;
    } catch {
      // ignore rollback errors
    }

    if (err instanceof Response) return err;

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
