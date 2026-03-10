import type { StockData, SectorSummary } from "@/types/Stock";

const buildSectorSummary = (sector: string, stocks: StockData[]): SectorSummary => {
  const totalInvestment = stocks.reduce((sum, s) => sum + s.investment, 0);
  const totalPresentValue = stocks.reduce((sum, s) => sum + s.presentValue, 0);

  return {
    sector,
    totalInvestment,
    totalPresentValue,
    gainLoss: totalPresentValue - totalInvestment,
    stocks,
  };
};

export const groupBySector = (stocks: StockData[]): SectorSummary[] => {
  const grouped: Record<string, StockData[]> = {};

  for (const stock of stocks) {
    const sector = stock.sector || "Other";
    if (!grouped[sector]) {
      grouped[sector] = [];
    }
    grouped[sector].push(stock);
  }

  return Object.entries(grouped).map(([sector, sectorStocks]) =>
    buildSectorSummary(sector, sectorStocks)
  );
};

const toIndianFormat = (num: number): string => {
  const [whole, decimal] = num.toFixed(2).split(".");
  const isNegative = whole.startsWith("-");
  const digits = isNegative ? whole.slice(1) : whole;

  let result = "";
  const len = digits.length;

  for (let i = 0; i < len; i++) {
    const pos = len - i;
    if (i > 0 && pos === 3) result += ",";
    if (i > 0 && pos > 3 && pos % 2 === 1) result += ",";
    result += digits[i];
  }

  return `${isNegative ? "-" : ""}${result}.${decimal}`;
};

export const formatCurrency = (value: number): string => {
  return `₹${toIndianFormat(value)}`;
};

export const formatNumber = (value: number): string => {
  return toIndianFormat(value);
};

export const formatCompactCurrency = (value: number): string => {
  let abs = value;
  let sign = "";

  if (value < 0) {
    abs = value * -1;
    sign = "-";
  }

  if (abs >= 10000000) {
    return sign + "₹" + (abs / 10000000).toFixed(2) + "Cr";
  }
  if (abs >= 100000) {
    return sign + "₹" + (abs / 100000).toFixed(2) + "L";
  }
  if (abs >= 1000) {
    return sign + "₹" + (abs / 1000).toFixed(1) + "K";
  }
  return sign + "₹" + abs.toFixed(0);
};
