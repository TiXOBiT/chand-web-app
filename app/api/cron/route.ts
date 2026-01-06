import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import axios from 'axios';
import * as cheerio from 'cheerio';

// این خط باعث می‌شود کش نشود و همیشه دیتای تازه بگیرد
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await axios.get('https://www.bonbast.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache'
      }
    });

    const $ = cheerio.load(response.data);
    
    // تابع کمکی برای تمیز کردن قیمت
    const getPrice = (id: string) => {
        const txt = $(`#${id}`).text();
        return txt ? parseInt(txt.replace(/,/g, '').trim()) : 0;
    };

    const data = [
      { key: 'dollar', price: getPrice('usd1') },
      { key: 'euro', price: getPrice('eur1') },
      { key: 'gold_18', price: getPrice('gol18') },
      { key: 'coin_emami', price: getPrice('emami1') }
    ];

    const validData = data.filter(d => d.price > 0);
    
    if (validData.length > 0) {
        // ذخیره در دیتابیس
        await Promise.all(validData.map(item => 
            sql`INSERT INTO prices (currency, price) VALUES (${item.key}, ${item.price})`
        ));
    }

    return NextResponse.json({ status: 'success', saved: validData.length });
  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}