"use client";

import * as React from "react";
import PriceCard from "@/components/PriceCard";
import ChartComponent, { ChartPoint } from "@/components/ChartComponent";

type Period = "1D" | "1W" | "1M" | "1Y";
type Currency = "usd" | "eur" | "gold" | "coin";

type ChartResponse = {
  ok: boolean;
  currency: Currency;
  period: Period;
  current_price: number | null;
  current_timestamp: string | null;
  chart_data: Array<{ timestamp: string; price: number }>;
  error?: string;
};

const CURRENCIES: Array<{
  key: Currency;
  title: string;
  icon: string;
  subtitle: string;
}> = [
  { key: "usd", title: "US Dollar", icon: "🇺🇸", subtitle: "Toman" },
  { key: "eur", title: "Euro", icon: "🇪🇺", subtitle: "Toman" },
  { key: "gold", title: "Gold (Gram)", icon: "🪙", subtitle: "Toman" },
  { key: "coin", title: "Coin (Emami)", icon: "🟡", subtitle: "Toman" },
];

const PERIODS: Period[] = ["1D", "1W", "1M", "1Y"];

function useTheme() {
  const [theme, setTheme] = React.useState<"system" | "light" | "dark">("system");

  React.useEffect(() => {
    const saved = (localStorage.getItem("theme") as typeof theme | null) ?? "system";
    setTheme(saved);
  }, []);

  React.useEffect(() => {
    localStorage.setItem("theme", theme);

    const root = document.documentElement;
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;

    const shouldDark = theme === "dark" || (theme === "system" && prefersDark);
    root.classList.toggle("dark", shouldDark);
  }, [theme]);

  return { theme, setTheme };
}

async function fetchChart(currency: Currency, period: Period): Promise<ChartResponse> {
  const url = `/api/chart?currency=${encodeURIComponent(currency)}&period=${encodeURIComponent(period)}`;
  const res = await fetch(url, { cache: "no-store" });
  return (await res.json()) as ChartResponse;
}

export default function Page() {
  const { theme, setTheme } = useTheme();

  const [selectedCurrency, setSelectedCurrency] = React.useState<Currency>("usd");
  const [period, setPeriod] = React.useState<Period>("1D");

  const [cards, setCards] = React.useState<Record<Currency, number | null>>({
    usd: null,
    eur: null,
    gold: null,
    coin: null,
  });

  const [chartData, setChartData] = React.useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);

  const loadCards = React.useCallback(async () => {
    try {
      const results = await Promise.all(
        (["usd", "eur", "gold", "coin"] as Currency[]).map(async (c) => {
          const r = await fetchChart(c, "1D");
          return [c, r] as const;
        })
      );

      const next: Record<Currency, number | null> = { usd: null, eur: null, gold: null, coin: null };
      for (const [c, r] of results) {
        if (r.ok) next[c] = r.current_price ?? null;
      }
      setCards(next);
    } catch (e) {
      // cards are “nice to have”; don’t hard-fail the page
      console.error(e);
    }
  }, []);

  const loadChart = React.useCallback(async () => {
    setChartLoading(true);
    setError(null);

    try {
      const r = await fetchChart(selectedCurrency, period);
      if (!r.ok) {
        setError(r.error ?? "Failed to load chart");
        setChartData([]);
        setLastUpdated(null);
        return;
      }

      setChartData(r.chart_data);
      setLastUpdated(r.current_timestamp ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setChartData([]);
      setLastUpdated(null);
    } finally {
      setChartLoading(false);
    }
  }, [selectedCurrency, period]);

  React.useEffect(() => {
    void loadCards();
    void loadChart();

    // refresh periodically (adjust as desired)
    const t = window.setInterval(() => {
      void loadCards();
      void loadChart();
    }, 30_000);

    return () => window.clearInterval(t);
  }, [loadCards, loadChart]);

  const selectedMeta = CURRENCIES.find((c) => c.key === selectedCurrency);

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 text-neutral-900 dark:text-neutral-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Real-time Currency & Gold Tracker</h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              Live prices + smart downsampled charts (mobile-friendly API).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as any)}
              className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm backdrop-blur dark:border-white/10 dark:bg-neutral-950/60"
              aria-label="Theme"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CURRENCIES.map((c) => (
            <PriceCard
              key={c.key}
              title={c.title}
              subtitle={c.subtitle}
              icon={c.icon}
              price={cards[c.key]}
              isSelected={c.key === selectedCurrency}
              onClick={() => setSelectedCurrency(c.key)}
              live
            />
          ))}
        </section>

        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold">
                {selectedMeta?.icon} {selectedMeta?.title}
              </div>
              {lastUpdated ? (
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Updated: {new Date(lastUpdated).toLocaleString()}
                </div>
              ) : null}
            </div>

            <div className="inline-flex overflow-hidden rounded-xl border border-black/10 bg-white/60 backdrop-blur dark:border-white/10 dark:bg-neutral-950/50">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={[
                    "px-3 py-2 text-sm transition",
                    p === period
                      ? "bg-black/5 dark:bg-white/10 font-medium"
                      : "hover:bg-black/5 dark:hover:bg-white/10",
                  ].join(" ")}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            {error ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
                {error}
              </div>
            ) : null}

            <ChartComponent
              title={`${selectedMeta?.title ?? selectedCurrency} • ${period}`}
              subtitle={chartLoading ? "Loading chart…" : `${chartData.length} points`}
              data={chartData}
              className="mt-3"
            />
          </div>
        </section>

        <footer className="mt-8 text-xs text-neutral-500 dark:text-neutral-400">
          Tip: Trigger <code className="rounded bg-black/5 px-1 dark:bg-white/10">/api/setup</code> once (with header{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">x-setup-token</code>) and schedule{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">/api/cron</code> every 5 minutes with{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">Authorization: Bearer CRON_SECRET</code>.
        </footer>
      </div>
    </main>
  );
}
