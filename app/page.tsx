'use client';
import { useState, useEffect } from 'react';
import PriceCard from '@/components/PriceCard';
import ChartComponent from '@/components/ChartComponent';

export default function Home() {
  const [selectedCurrency, setSelectedCurrency] = useState('dollar');
  const [period, setPeriod] = useState('1D');
  const [chartData, setChartData] = useState<any[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [loading, setLoading] = useState(true);

  // لیست ارزها
  const currencies = [
    { key: 'dollar', title: 'US Dollar', code: 'USD' },
    { key: 'euro', title: 'Euro', code: 'EUR' },
    { key: 'gold_18', title: 'Gold 18k', code: 'XAU' },
    { key: 'coin_emami', title: 'Emami Coin', code: 'COIN' },
  ];

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/chart?currency=${selectedCurrency}&period=${period}`);
        const data = await res.json();
        setChartData(data.chart_data || []);
        setCurrentPrice(data.current_price || 0);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedCurrency, period]);

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-500">
          Chand?!
        </h1>
      </header>

      {/* بخش کارت ها */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {currencies.map((curr) => (
          <PriceCard
            key={curr.key}
            title={curr.title}
            code={curr.code}
            price={curr.key === selectedCurrency ? currentPrice : null}
            isSelected={selectedCurrency === curr.key}
            onClick={() => setSelectedCurrency(curr.key)}
          />
        ))}
      </div>

      {/* بخش نمودار بزرگ */}
      <div className="bg-[#1c1c1e] rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h2 className="text-4xl font-bold mb-1">
                {currentPrice ? currentPrice.toLocaleString() : 'Loading...'}
            </h2>
            <p className="text-gray-400 text-sm uppercase">{selectedCurrency}</p>
          </div>

          <div className="bg-black/50 p-1 rounded-xl flex gap-1">
            {['1D', '1W', '1M', '1Y'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all 
                  ${period === p 
                    ? 'bg-gray-700 text-white shadow-lg' 
                    : 'text-gray-500 hover:text-gray-300'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
           <div className="h-[300px] flex items-center justify-center text-gray-500 animate-pulse">
               Updating Chart...
           </div>
        ) : (
           <ChartComponent data={chartData} />
        )}
      </div>
    </main>
  );
}