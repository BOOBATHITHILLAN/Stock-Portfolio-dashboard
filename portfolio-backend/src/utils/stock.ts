import yahooFinance from "yahoo-finance2";
import { fetchGoogleMetrics } from "./scraper";
import { StockInput } from "../types/stockTypes";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Handle ESM import behavior
const yf =
  typeof yahooFinance === "function"
    ? new (yahooFinance as any)()
    : yahooFinance;

export const getUpdatedStockData = async (stock: StockInput) => {
  try {
    // small delay to reduce rate limiting
    await sleep(800);

    const quote: any = await yf.quote(stock.symbol);
    const google: any = await fetchGoogleMetrics(stock.symbol);

    const cmp = quote?.regularMarketPrice || 0;
    const investment = stock.buyPrice * stock.qty;
    const presentValue = cmp * stock.qty;

    return {
      ...stock,
      cmp,
      peRatio: google?.peRatio ?? "N/A",
      latestEarnings: google?.netIncome ?? "N/A",
      investment,
      presentValue,
      gainLoss: presentValue - investment,
    };
  } catch (error) {
    console.error(`Error updating ${stock.symbol}:`, error);

    const investment = stock.buyPrice * stock.qty;

    return {
      ...stock,
      cmp: 0,
      peRatio: "N/A",
      latestEarnings: "N/A",
      investment,
      presentValue: 0,
      gainLoss: -investment,
    };
  }
};