import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertSetupAuth(req: Request) {
  const expected = process.env.SETUP_TOKEN;
  const got = req.headers.get("x-setup-token") ?? "";
  if (!expected || got !== expected) {
    throw new Response("Unauthorized", { status: 401 });
  }
}

export async function GET(req: Request) {
  try {
    assertSetupAuth(req);

    await sql`BEGIN`;

    await sql`
      CREATE TABLE IF NOT EXISTS prices (
        id SERIAL PRIMARY KEY,
        currency VARCHAR(32) NOT NULL,
        price INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS prices_currency_created_at_idx
      ON prices (currency, created_at DESC);
    `;

    await sql`COMMIT`;

    return NextResponse.json(
      {
        ok: true,
        message: "DB ready: table prices + index prices_currency_created_at_idx",
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
