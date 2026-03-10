export interface StockInput {
  symbol: string;
  name: string;
  sector: string;
  qty: number;
  buyPrice: number;
}

export interface StockData extends StockInput {
  cmp: number;
  peRatio: string;
  latestEarnings: string;
  investment: number;
  presentValue: number;
  gainLoss: number;
  portfolioWeight: string;
}