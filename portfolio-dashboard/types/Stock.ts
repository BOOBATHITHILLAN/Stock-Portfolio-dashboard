export interface StockData {
  symbol: string;
  name: string;
  sector: string;
  qty: number;
  buyPrice: number;
  cmp: number;
  peRatio: string;
  latestEarnings: string;
  investment: number;
  presentValue: number;
  gainLoss: number;
  portfolioWeight: string;
}

export interface SectorSummary {
  sector: string;
  totalInvestment: number;
  totalPresentValue: number;
  gainLoss: number;
  stocks: StockData[];
}

export interface PortfolioResponse {
  status: string;
  message: string;
  data: StockData[];
}
