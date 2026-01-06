"use client";

import * as React from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: Array<string | undefined | null | false>) {
  return twMerge(clsx(inputs));
}

export type PriceCardProps = {
  title: string;
  subtitle?: string; // e.g. "Toman"
  icon?: string; // emoji or short label
  price: number | null;
  isSelected?: boolean;
  onClick?: () => void;
  live?: boolean;
};

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function PriceCard({
  title,
  subtitle = "Toman",
  icon = "💱",
  price,
  isSelected,
  onClick,
  live = true,
}: PriceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full text-left",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/25",
        isSelected ? "ring-1 ring-black/10 dark:ring-white/15 rounded-2xl" : "rounded-2xl"
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border",
          "bg-white/70 dark:bg-neutral-950/55",
          "border-black/5 dark:border-white/10",
          "backdrop-blur-xl shadow-[0_10px_30px_-15px_rgba(0,0,0,0.35)]",
          "transition-transform duration-200 will-change-transform",
          "group-hover:-translate-y-0.5"
        )}
      >
        {/* glossy highlight */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/60 via-white/20 to-transparent dark:from-white/10 dark:via-white/5 opacity-80" />
        <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-white/40 blur-3xl dark:bg-white/10" />

        <div className="relative p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-black/5 dark:bg-white/10">
                <span className="text-lg">{icon}</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {title}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</div>
              </div>
            </div>

            {live && (
              <div className="flex items-center gap-2 rounded-full border border-black/5 bg-white/60 px-2 py-1 text-[11px] font-medium text-neutral-700 dark:border-white/10 dark:bg-neutral-900/50 dark:text-neutral-200">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Live
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
              {price === null ? "—" : formatNumber(price)}
            </div>
            <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Tap to view chart
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
