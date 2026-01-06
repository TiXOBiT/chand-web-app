import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS prices (
        id SERIAL PRIMARY KEY,
        currency VARCHAR(20) NOT NULL,
        price INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    // ساخت ایندکس برای سرعت بالاتر
    await sql`CREATE INDEX IF NOT EXISTS idx_prices_currency_date ON prices(currency, created_at);`;
    
    return NextResponse.json({ message: 'Database created successfully' });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}