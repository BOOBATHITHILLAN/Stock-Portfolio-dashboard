"use client";

import { useMemo } from "react";
import type { StockData } from "@/types/Stock";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils";
import SummaryCard from "./SummaryCard";

type SummaryCardsProps = {
  data: StockData[];
};

const SummaryCards = ({ data }: SummaryCardsProps) => {
  const { totalInvestment, totalPresentValue, totalGainLoss, gainLossPercent } =
    useMemo(() => {
      const totalInvestment = data.reduce((sum, s) => sum + s.investment, 0);
      const totalPresentValue = data.reduce((sum, s) => sum + s.presentValue, 0);
      const totalGainLoss = totalPresentValue - totalInvestment;
      const gainLossPercent =
        totalInvestment > 0
          ? ((totalGainLoss / totalInvestment) * 100).toFixed(2)
          : "0";
      return { totalInvestment, totalPresentValue, totalGainLoss, gainLossPercent };
    }, [data]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
      <SummaryCard
        label="Total Investment"
        value={formatCurrency(totalInvestment)}
        compactValue={formatCompactCurrency(totalInvestment)}
      />
      <SummaryCard
        label="Present Value"
        value={formatCurrency(totalPresentValue)}
        compactValue={formatCompactCurrency(totalPresentValue)}
      />
      <SummaryCard
        label="Total Gain/Loss"
        value={formatCurrency(totalGainLoss)}
        compactValue={formatCompactCurrency(totalGainLoss)}
        subValue={`${totalGainLoss >= 0 ? "+" : ""}${gainLossPercent}%`}
        variant={totalGainLoss >= 0 ? "gain" : "loss"}
      />
      <SummaryCard
        label="Holdings"
        value={data.length.toString()}
        compactValue={data.length.toString()}
        subValue="stocks"
      />
    </div>
  );
};

export default SummaryCards;
