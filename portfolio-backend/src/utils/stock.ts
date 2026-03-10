import yahooFinance from "yahoo-finance2";
import { fetchGoogleMetrics } from "./scraper";
import { StockInput } from "../types/stockTypes";

// Initialize yahooFinance instance, handling ESM import behavior where it might be the class
const yf =
  typeof yahooFinance === "function"
    ? new (yahooFinance as any)()
    : yahooFinance;

/**
 * Fetches live data and calculates financial metrics for a single stock.
 * Handles parallel API requests and provides a fallback on failure.
 */
export const getUpdatedStockData = async (stock: StockInput) => {
  try {
    const [quote, google]: any = await Promise.all([
      yf.quote(stock.symbol),
      fetchGoogleMetrics(stock.symbol),
    ]);

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
