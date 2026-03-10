"use client";

import { memo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

type SummaryCardProps = {
  label: string;
  value: string;
  compactValue: string;
  subValue?: string;
  variant?: "gain" | "loss";
};

const SummaryCard = memo(({ label, value, compactValue, subValue, variant }: SummaryCardProps) => {
  const color = variant === "gain" ? "text-emerald-600" : variant === "loss" ? "text-red-600" : "text-slate-900";
  const subColor = variant === "gain" ? "text-emerald-500" : variant === "loss" ? "text-red-500" : "text-slate-400";

  return (
    <div className="rounded-lg sm:rounded-xl bg-white border border-slate-200 p-2.5 sm:p-4 shadow-sm">
      <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">{label}</p>
      <p className={`text-sm font-bold mt-0.5 sm:hidden tabular-nums ${color}`}>{compactValue}</p>
      <p className={`text-xl font-bold mt-1 hidden sm:block tabular-nums ${color}`}>{value}</p>
      {subValue && (
        <p className={`text-[10px] sm:text-xs mt-0.5 flex items-center gap-0.5 ${subColor}`}>
          {variant === "gain" && <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
          {variant === "loss" && <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
          {subValue}
        </p>
      )}
    </div>
  );
});

SummaryCard.displayName = "SummaryCard";

export default SummaryCard;
