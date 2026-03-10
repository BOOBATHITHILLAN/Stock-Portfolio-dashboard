import yahooFinance from "yahoo-finance2";
import { fetchGoogleMetrics } from "./scraper";
import { StockInput } from "../types/stockTypes";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const MAX_RETRIES = 3;
  let delay = 1000; // start with 1 second

  for (let i = 0; i < MAX_RETRIES; i++) {
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
    } catch (error: any) {
      if (error.message?.includes("429") && i < MAX_RETRIES - 1) {
        console.warn(
          `Rate limit hit for ${stock.symbol}. Retrying in ${delay / 1000}s...`
        );
        await sleep(delay);
        delay *= 2; // Exponential backoff
      } else {
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
    }
  }
};
