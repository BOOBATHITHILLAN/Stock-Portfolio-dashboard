import axios from "axios";
import * as cheerio from "cheerio";

export const fetchGoogleMetrics = async (symbol: string) => {
  try {
    let googleSymbol = symbol;
    if (symbol.endsWith(".NS") || symbol.endsWith(".NSE")) {
      googleSymbol = symbol.replace(/\.(NS|NSE)$/, "") + ":NSE";
    } else if (symbol.endsWith(".BO") || symbol.endsWith(".BSE")) {
      googleSymbol = symbol.replace(/\.(BO|BSE)$/, "") + ":BOM";
    }

    const url = `https://www.google.com/finance/quote/${googleSymbol}`;

    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(html);

    const result: Record<string, string> = {};

    const labelMap: Record<string, string> = {
      "P/E ratio": "peRatio",
      "Market cap": "marketCap",
      "Dividend yield": "dividendYield",
      "Year range": "yearRange",
      "Previous close": "previousClose",
      "Day range": "dayRange",
      "Avg Volume": "avgVolume",
    };
    $(".gyFHrc").each((_, row) => {
      const label = $(row).find(".mfs7Fc").text().trim();
      const value = $(row).find(".P6K39c").text().trim();
      const key = labelMap[label];
      if (key && value) {
        result[key] = value;
      }
    });
    const financials: Record<string, string> = {};
    $(".roXhBd").each((_, row) => {
      const label = $(row).find(".rsPbEe").text().trim();
      const value = $(row).find(".QXDnM").text().trim();
      if (label && value && value !== "—") {
        // Only keep the first occurrence (income statement, not cash flow duplicate)
        if (!financials[label]) {
          financials[label] = value;
        }
      }
    });

    let high52 = "N/A";
    let low52 = "N/A";
    if (result.yearRange) {
      const parts = result.yearRange.split(" - ");
      if (parts.length === 2) {
        low52 = parts[0].trim();
        high52 = parts[1].trim();
      }
    }

    return {
      peRatio: result.peRatio ?? "N/A",
      marketCap: result.marketCap ?? "N/A",
      dividendYield: result.dividendYield ?? "N/A",
      high52,
      low52,
      previousClose: result.previousClose ?? "N/A",
      revenue: financials["Revenue"] ?? "N/A",
      netIncome: financials["Net income"] ?? "N/A",
      eps: financials["Earnings per share"] ?? "N/A",
      netProfitMargin: financials["Net profit margin"] ?? "N/A",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`No Google metrics for ${symbol}: ${msg}`);
    return null;
  }
};
