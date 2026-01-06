'use client';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';

export default function ChartComponent({ data }: { data: any[] }) {
  const startPrice = data?.[0]?.price || 0;
  const endPrice = data?.[data.length - 1]?.price || 0;
  const isProfit = endPrice >= startPrice;
  const color = isProfit ? '#22c55e' : '#ef4444';

  return (
    <div className='w-full h-[300px] mt-4'>
      <ResponsiveContainer width='100%' height='100%'>
        <AreaChart data={data}>
          <defs>
            <linearGradient id='colorGradient' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='5%' stopColor={color} stopOpacity={0.3}/>
              <stop offset='95%' stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Tooltip 
            contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px', color: '#fff' }}
            formatter={(value: any) => value.toLocaleString()}
            labelFormatter={() => ''}
          />
          <Area 
            type='monotone' 
            dataKey='price' 
            stroke={color} 
            strokeWidth={3}
            fillOpacity={1} 
            fill='url(#colorGradient)' 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
