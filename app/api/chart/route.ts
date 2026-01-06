import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const currency = searchParams.get('currency') || 'dollar';
  const period = searchParams.get('period') || '1D';

  let query;

  try {
    // منطق انتخاب بازه زمانی
    switch (period) {
      case '1D':
        query = sql`SELECT price, created_at FROM prices WHERE currency = ${currency} AND created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at ASC`;
        break;
      case '1W':
        query = sql`SELECT AVG(price)::int as price, date_trunc('hour', created_at) as created_at FROM prices WHERE currency = ${currency} AND created_at > NOW() - INTERVAL '7 days' GROUP BY 2 ORDER BY created_at ASC`;
        break;
      case '1M':
        query = sql`SELECT AVG(price)::int as price, to_timestamp(floor((extract('epoch' from created_at) / 21600 )) * 21600) as created_at FROM prices WHERE currency = ${currency} AND created_at > NOW() - INTERVAL '1 month' GROUP BY 2 ORDER BY created_at ASC`;
        break;
      case '1Y':
        query = sql`SELECT AVG(price)::int as price, date_trunc('day', created_at) as created_at FROM prices WHERE currency = ${currency} AND created_at > NOW() - INTERVAL '1 year' GROUP BY 2 ORDER BY created_at ASC`;
        break;
      default:
         query = sql`SELECT price, created_at FROM prices WHERE currency = ${currency} LIMIT 10`;
    }

    const result = await query;
    
    // فرمت دهی داده‌ها برای فرانت‌اند
    const chartData = result.rows.map(row => ({
      price: row.price,
      time: new Date(row.created_at).getTime(),
      formattedTime: new Date(row.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute:'2-digit' })
    }));

    const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 0;

    return NextResponse.json({
      currency,
      period,
      current_price: currentPrice,
      chart_data: chartData
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}