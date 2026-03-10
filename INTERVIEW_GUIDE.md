# Portfolio Dashboard — Interview Code Walkthrough

Line-by-line explanation of every file for interview preparation.

---

## Table of Contents

1. [Backend](#backend)
   - [Types](#1-types)
   - [Mock Data](#2-mock-data)
   - [Google Finance Scraper](#3-google-finance-scraper)
   - [Stock Data Fetcher](#4-stock-data-fetcher)
   - [Routes & Rate Limiting](#5-routes--rate-limiting)
   - [Controller](#6-controller)
   - [Server Entry Point](#7-server-entry-point)
2. [Frontend](#frontend)
   - [Types](#8-frontend-types)
   - [Utility Functions](#9-utility-functions)
   - [Custom Hook — usePortfolio](#10-custom-hook--useportfolio)
   - [API Route (Proxy)](#11-api-route-proxy)
   - [Root Layout](#12-root-layout)
   - [Home Page](#13-home-page)
   - [Dashboard Component](#14-dashboard-component)
   - [Header](#15-header)
   - [Summary Cards](#16-summary-cards--summarycard)
   - [Error Banner](#17-error-banner)
   - [Loading State](#18-loading-state)
   - [Portfolio Table](#19-portfolio-table)
3. [Architecture Decisions](#architecture-decisions)
4. [Common Interview Questions](#common-interview-questions)

---

## Backend

### 1. Types

**`portfolio-backend/src/types/stockTypes.ts`**

```ts
export interface StockInput {
  symbol: string;      // Yahoo Finance ticker (e.g., "HDFCBANK.NSE", "532174.BO")
  name: string;        // Display name
  sector: string;      // Used for grouping in the table
  qty: number;         // Number of shares held
  buyPrice: number;    // Purchase price per share
}
```

- `StockInput` = what we know before fetching any live data (our portfolio holdings)
- `symbol` uses Yahoo Finance format — `.NS`/`.NSE` for NSE, `.BO`/`.BSE` for BSE

```ts
export interface StockData extends StockInput {
  cmp: number;              // Current Market Price (from Yahoo Finance)
  peRatio: string;          // Price-to-Earnings ratio (from Google Finance)
  latestEarnings: string;   // Net Income (from Google Finance)
  investment: number;       // buyPrice × qty
  presentValue: number;     // cmp × qty
  gainLoss: number;         // presentValue - investment
  portfolioWeight: string;  // percentage of total portfolio value
}
```

- `StockData` extends `StockInput` — adds all the calculated & fetched fields
- `peRatio` and `latestEarnings` are strings because Google returns formatted values like `"19.42"` and `"₹64,062.00Cr"`
- `portfolioWeight` is a string because it's already formatted as `"5.23"` (percentage)

**`portfolio-backend/src/types/response.ts`**

```ts
export interface ApiResponse<T> {
  status: 'success' | 'error';   // Only two possible states
  message: string;                // Human-readable message
  data: T | null;                 // null on error, actual data on success
}
```

- Generic type `<T>` so the same response shape works for any data type
- `data: T | null` — when status is `'error'`, data is always `null`

---

### 2. Mock Data

**`portfolio-backend/src/mockdata/mockStocks.ts`**

```ts
import { StockInput } from "../types/stockTypes";

export const MOCK_STOCKS: StockInput[] = [
  {
    symbol: "HDFCBANK.NSE",
    name: "HDFC Bank",
    sector: "Financial Sector",
    qty: 50,
    buyPrice: 1490,
  },
  // ... 25 more stocks across 6 sectors
];
```

- This is the "database" — in a real app this would come from a DB or user input
- 26 stocks spread across: Financial, Tech, Consumer, Power, Pipe, Others
- Some use NSE tickers (`HDFCBANK.NSE`), others use BSE numeric codes (`532174.BO`)
- The scraper handles converting these to the right format for each data source

---

### 3. Google Finance Scraper

**`portfolio-backend/src/utils/scraper.ts`**

```ts
import axios from "axios";
import * as cheerio from "cheerio";
```

- `axios` — HTTP client to fetch raw HTML from Google Finance
- `cheerio` — jQuery-like library for parsing HTML on the server (no browser needed)

```ts
export const fetchGoogleMetrics = async (symbol: string) => {
  try {
    let googleSymbol = symbol;
    if (symbol.endsWith(".NS") || symbol.endsWith(".NSE")) {
      googleSymbol = symbol.replace(/\.(NS|NSE)$/, "") + ":NSE";
    } else if (symbol.endsWith(".BO") || symbol.endsWith(".BSE")) {
      googleSymbol = symbol.replace(/\.(BO|BSE)$/, "") + ":BOM";
    }
```

- Yahoo uses `.NS` / `.BO` format, Google uses `:NSE` / `:BOM`
- `replace(/\.(NS|NSE)$/, "")` — regex removes the suffix. `$` = end of string
- Example: `"HDFCBANK.NSE"` → `"HDFCBANK"` → `"HDFCBANK:NSE"`
- BSE note: Google uses `:BOM` (Bombay), not `:BSE`

```ts
    const url = `https://www.google.com/finance/quote/${googleSymbol}`;

    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 10000,
    });
```

- `User-Agent` header — pretends to be a real browser so Google doesn't block the request
- `Accept-Language` — ensures we get English page (not localized)
- `timeout: 10000` — 10 second timeout, don't hang forever
- `{ data: html }` — destructures axios response, renames `data` to `html`

```ts
    const $ = cheerio.load(html);
```

- `cheerio.load()` parses the HTML string and returns a jQuery-like `$` function
- Now we can use CSS selectors to find elements

```ts
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
```

- `labelMap` maps Google's display labels to our property names
- `Record<string, string>` = an object where both keys and values are strings

```ts
    $(".gyFHrc").each((_, row) => {
      const label = $(row).find(".mfs7Fc").text().trim();
      const value = $(row).find(".P6K39c").text().trim();
      const key = labelMap[label];
      if (key && value) {
        result[key] = value;
      }
    });
```

- `.gyFHrc` — CSS class for each row in the "About" sidebar on Google Finance
- `.mfs7Fc` — the label element (e.g., "P/E ratio")
- `.P6K39c` — the value element (e.g., "19.42")
- These class names are obfuscated by Google — found by inspecting the raw HTML
- `labelMap[label]` — only saves values we care about (ignores unknown labels)

```ts
    const financials: Record<string, string> = {};
    $(".roXhBd").each((_, row) => {
      const label = $(row).find(".rsPbEe").text().trim();
      const value = $(row).find(".QXDnM").text().trim();
      if (label && value && value !== "—") {
        if (!financials[label]) {
          financials[label] = value;
        }
      }
    });
```

- `.roXhBd` — rows in the "Financials" table (income statement section)
- `.rsPbEe` / `.QXDnM` — label and value classes in that table
- `value !== "—"` — Google shows "—" for missing data, skip those
- `if (!financials[label])` — keeps only the FIRST occurrence (income statement, not cash flow duplicate)

```ts
    return {
      peRatio: result.peRatio ?? "N/A",
      marketCap: result.marketCap ?? "N/A",
      dividendYield: result.dividendYield ?? "N/A",
      revenue: financials["Revenue"] ?? "N/A",
      netIncome: financials["Net income"] ?? "N/A",
      eps: financials["Earnings per share"] ?? "N/A",
      // ...
    };
  } catch (err) {
    console.warn(`No Google metrics for ${symbol}: ${msg}`);
    return null;
  }
```

- `??` — nullish coalescing. If left side is `null` or `undefined`, use `"N/A"`
- Returns `null` on error (not throwing) — the caller handles null gracefully

---

### 4. Stock Data Fetcher

**`portfolio-backend/src/utils/stock.ts`**

```ts
import yahooFinance from "yahoo-finance2";
import { fetchGoogleMetrics } from "./scraper";
import { StockInput } from "../types/stockTypes";

const yf =
  typeof yahooFinance === "function"
    ? new (yahooFinance as any)()
    : yahooFinance;
```

- `yahoo-finance2` has ESM/CJS import inconsistencies
- This check handles both cases: if it's a class (constructor), instantiate it; if it's already an instance, use directly

```ts
export const getUpdatedStockData = async (stock: StockInput) => {
  try {
    const [quote, google]: any = await Promise.all([
      yf.quote(stock.symbol),
      fetchGoogleMetrics(stock.symbol),
    ]);
```

- **`Promise.all`** — fires both API calls simultaneously, not sequentially
- Without this: Yahoo (2s) + Google (2s) = 4s. With `Promise.all`: ~2s total
- `[quote, google]` — destructures the results array in order

```ts
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
```

- `quote?.regularMarketPrice` — optional chaining, Yahoo's field for current price
- `...stock` — spread operator copies all StockInput fields into the result
- `google?.peRatio ?? "N/A"` — if Google scraping returned null, fallback to "N/A"
- `gainLoss` = how much profit/loss on this holding

```ts
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
```

- If both Yahoo and Google fail, return zero values instead of crashing
- `gainLoss: -investment` — if CMP is 0, you've "lost" your entire investment (worst case display)

---

### 5. Routes & Rate Limiting

**`portfolio-backend/src/routes/portfolioRoutes.ts`**

```ts
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getPortfolioData } from "../controllers/portfolioController";

const router = Router();
```

- `Router()` — creates an Express router (mini-app for grouping routes)

```ts
const portfolioLimiter = rateLimit({
  windowMs: 60 * 1000,     // 1-minute window
  max: 4,                   // max 4 requests per minute per IP
  standardHeaders: true,    // sends RateLimit-* headers in response
  legacyHeaders: false,     // don't send X-RateLimit-* (old format)
  message: {
    status: "error",
    message: "Too many requests. Please try again after a minute.",
    data: null,
  },
});
```

- Rate limiting prevents abuse — 4 requests/minute is enough for 15s auto-refresh
- `standardHeaders: true` — browser can read `RateLimit-Remaining` header
- `message` — matches our `ApiResponse` shape so the frontend handles it like any other error

```ts
router.get("/portfolio", portfolioLimiter, getPortfolioData);
```

- Middleware chain: request → rate limit check → controller
- If rate limited, the `message` object is returned as the response (never reaches controller)

---

### 6. Controller

**`portfolio-backend/src/controllers/portfolioController.ts`**

```ts
export const getPortfolioData = async (req: Request, res: Response) => {
  try {
    const updatedPortfolio = await Promise.all(
      MOCK_STOCKS.map((stock) => getUpdatedStockData(stock)),
    );
```

- `MOCK_STOCKS.map(...)` — creates an array of 26 promises (one per stock)
- `Promise.all(...)` — runs ALL 26 in parallel. Total time ≈ slowest single request (~2-3s)
- Without `Promise.all`: 26 × 2s = ~52 seconds. With it: ~2-3 seconds

```ts
    const totalValue = updatedPortfolio.reduce(
      (sum, s) => sum + s.presentValue,
      0,
    );

    const finalData = updatedPortfolio.map((s) => ({
      ...s,
      portfolioWeight:
        totalValue > 0 ? ((s.presentValue / totalValue) * 100).toFixed(2) : "0",
    }));
```

- First `reduce` — sums up all present values to get total portfolio value
- Then `map` — adds `portfolioWeight` to each stock (what % of your portfolio is this stock)
- `toFixed(2)` — rounds to 2 decimal places, returns string like `"5.23"`
- `totalValue > 0` guard prevents division by zero

```ts
    const response: ApiResponse<any> = {
      status: "success",
      message: "Portfolio updated successfully",
      data: finalData,
    };
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to process portfolio",
      data: null,
    });
  }
};
```

- Consistent response shape for both success and error
- 200 for success, 500 for server errors

---

### 7. Server Entry Point

**`portfolio-backend/src/server.ts`**

```ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import portfolioRoutes from "./routes/portfolioRoutes";

dotenv.config();
```

- `dotenv.config()` — reads `.env` file and puts variables into `process.env`

```ts
const app = express();
app.use(cors());
app.use(express.json());
```

- `cors()` — allows requests from any origin (needed because frontend is on port 3000, backend on 5000)
- `express.json()` — parses JSON request bodies (not strictly needed for GET-only API, but good practice)

```ts
app.use("/api", portfolioRoutes);
```

- Mounts all routes under `/api` prefix
- So `router.get("/portfolio")` becomes `GET /api/portfolio`

```ts
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

- Falls back to port 5000 if no `PORT` env var is set

---

## Frontend

### 8. Frontend Types

**`portfolio-dashboard/types/Stock.ts`**

```ts
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
```

- Mirrors the backend's `StockData` interface
- This is what comes back from the API for each stock

```ts
export interface SectorSummary {
  sector: string;
  totalInvestment: number;
  totalPresentValue: number;
  gainLoss: number;
  stocks: StockData[];
}
```

- Used for grouping stocks by sector in the table
- `stocks` array holds all stocks belonging to this sector
- Totals are pre-calculated for the sector header row

```ts
export interface PortfolioResponse {
  status: string;
  message: string;
  data: StockData[];
}
```

- Shape of the API response from `/api/stocks`

---

### 9. Utility Functions

**`portfolio-dashboard/lib/utils.ts`**

```ts
import type { StockData, SectorSummary } from "@/types/Stock";
```

- `import type` — TypeScript-only import, stripped at compile time (no runtime cost)
- `@/` — path alias for the project root (configured in `tsconfig.json`)

```ts
export const groupBySector = (stocks: StockData[]): SectorSummary[] => {
  const map = new Map<string, StockData[]>();

  for (const stock of stocks) {
    const sector = stock.sector || "Other";
    if (!map.has(sector)) map.set(sector, []);
    map.get(sector)!.push(stock);
  }
```

- `Map` is used over a plain object because it preserves insertion order
- `stock.sector || "Other"` — fallback if sector is empty/null
- `map.get(sector)!` — `!` is non-null assertion (we just checked `has` or `set`)

```ts
  return Array.from(map.entries()).map(([sector, stocks]) => {
    const totalInvestment = stocks.reduce((sum, s) => sum + s.investment, 0);
    const totalPresentValue = stocks.reduce((sum, s) => sum + s.presentValue, 0);
    return {
      sector,
      totalInvestment,
      totalPresentValue,
      gainLoss: totalPresentValue - totalInvestment,
      stocks,
    };
  });
};
```

- `Array.from(map.entries())` — converts Map to array of `[key, value]` pairs
- `.map(([sector, stocks]) => ...)` — destructures each `[key, value]` pair
- `reduce` sums up investment and present value per sector
- Returns array of `SectorSummary` objects, each containing its stocks

```ts
export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
```

- `Intl.NumberFormat` — built-in browser API for locale-aware formatting
- `"en-IN"` — Indian English locale (uses lakh/crore separators: 1,00,000 not 100,000)
- `currency: "INR"` — adds ₹ symbol
- Output: `₹1,49,000.00`

```ts
export const formatCompactCurrency = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
};
```

- Used on mobile where full currency doesn't fit
- `1_00_00_000` — numeric separators matching Indian numbering (1 crore)
- `1_00_000` — 1 lakh
- Output examples: `₹1.20Cr`, `₹74.50L`, `₹45.0K`
- Handles negative values with `sign` prefix

---

### 10. Custom Hook — usePortfolio

**`portfolio-dashboard/hooks/usePortfolio.ts`**

```ts
"use client";
```

- Required because hooks use browser APIs (`useState`, `useEffect`)
- Next.js App Router renders components on the server by default; `"use client"` opts out

```ts
const REFRESH_INTERVAL = 15_000;
```

- 15 seconds between auto-refreshes
- `15_000` — numeric separator for readability (same as `15000`)

```ts
export const usePortfolio = () => {
  const [data, setData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cancelledRef = useRef(false);
```

- `useState(true)` — starts as loading (data hasn't arrived yet)
- `useRef` for `timeoutRef` — stores the setTimeout ID so we can cancel it
- `useRef` for `cancelledRef` — tracks if component unmounted (prevents state updates after unmount)
- Refs don't trigger re-renders when changed (unlike state)

```ts
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/stocks");
      const res: PortfolioResponse = await response.json();

      if (res.status === "success" && res.data) {
        setData(res.data);
        setLastUpdated(new Date());
      } else {
        setError(res.message || "Failed to fetch portfolio data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, []);
```

- `useCallback` with `[]` — memoizes this function so it has a stable identity across renders
- `fetch("/api/stocks")` — hits the Next.js API route (same origin, no CORS)
- `finally` — `setLoading(false)` runs whether success or failure

```ts
  const scheduleNext = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      await load();
      if (!cancelledRef.current) scheduleNext();
    }, REFRESH_INTERVAL);
  }, [load]);
```

- Recursive scheduling: after each load completes, schedule the next one
- `clearTimeout` first — prevents stacking multiple timers
- `if (!cancelledRef.current)` — don't schedule if component already unmounted

```ts
  const stopAutoRefresh = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
```

- Cancels any pending refresh timer

```ts
  useEffect(() => {
    cancelledRef.current = false;
    load().then(() => scheduleNext());
    return () => {
      cancelledRef.current = true;
      stopAutoRefresh();
    };
  }, [load, scheduleNext, stopAutoRefresh]);
```

- Runs on mount: loads data, then starts the refresh loop
- Cleanup function (returned arrow function) runs on unmount:
  - Sets `cancelledRef` to prevent any in-flight callbacks from scheduling more
  - Clears the timer

```ts
  const refresh = useCallback(async () => {
    stopAutoRefresh();
    await load();
    scheduleNext();
  }, [load, scheduleNext, stopAutoRefresh]);

  return { data, loading, error, lastUpdated, refresh };
};
```

- Manual refresh: stops current timer → loads fresh data → restarts the 15s countdown
- Returns everything the UI needs: data, loading state, error, timestamp, refresh function

---

### 11. API Route (Proxy)

**`portfolio-dashboard/app/api/stocks/route.ts`**

```ts
import { NextResponse } from "next/server";
import axios from "axios";

const API_BASE = process.env.API_URL || "http://localhost:5000";
```

- `NextResponse` — Next.js helper for creating API responses
- `API_BASE` comes from `.env.local` — server-side only (no `NEXT_PUBLIC_` prefix)
- This means the browser never sees the backend URL

```ts
let cachedData: unknown = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10_000;
```

- Module-level variables — persist across requests (in-memory cache)
- `unknown` type — we don't validate the shape here, just pass it through
- 10-second cache: if frontend refreshes every 15s, most requests will be cache hits

```ts
export const GET = async () => {
  try {
    const now = Date.now();

    if (cachedData && now - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json(cachedData, { headers: { "X-Cache": "HIT" } });
    }
```

- `export const GET` — Next.js App Router convention: named export matching HTTP method
- Cache check: if data exists AND it's less than 10 seconds old, return it
- `X-Cache: HIT` header — useful for debugging (check in DevTools Network tab)

```ts
    const { data } = await axios.get(`${API_BASE}/api/portfolio`, { timeout: 30000 });
    cachedData = data;
    cacheTimestamp = now;

    return NextResponse.json(data, { headers: { "X-Cache": "MISS" } });
```

- Cache miss: fetch from Express backend, store in cache, return with `MISS` header
- 30-second timeout because backend fetches 26 stocks from external APIs

```ts
  } catch (error) {
    if (cachedData) {
      return NextResponse.json(cachedData, { headers: { "X-Cache": "STALE" } });
    }

    const message = error instanceof Error ? error.message : "Failed to fetch portfolio";
    return NextResponse.json({ status: "error", message, data: null }, { status: 500 });
  }
};
```

- **Stale cache fallback** — if backend is down but we have old data, serve it (better than nothing)
- `X-Cache: STALE` — indicates this is old data
- Last resort: no cache, backend down → return error

---

### 12. Root Layout

**`portfolio-dashboard/app/layout.tsx`**

```ts
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
```

- `Metadata` type — Next.js type for `<head>` metadata (title, description)
- `next/font/google` — automatically optimizes Google Fonts (self-hosts them, eliminates layout shift)

```ts
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
```

- `variable: "--font-geist-sans"` — creates a CSS variable instead of applying font directly
- `subsets: ["latin"]` — only loads Latin characters (smaller download)
- These run at build time, not runtime

```ts
export const metadata: Metadata = {
  title: "Portfolio Dashboard",
  description: "Real-time stock portfolio tracker with Yahoo & Google Finance",
};
```

- Static metadata export — Next.js reads this and generates `<title>` and `<meta>` tags
- Only works in Server Components (layouts and pages)

```ts
const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => (
  <html lang="en">
    <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      {children}
    </body>
  </html>
);

export default RootLayout;
```

- `Readonly<>` — TypeScript utility, prevents accidentally mutating props
- `${geistSans.variable}` — applies the CSS variable class so descendants can use `font-family: var(--font-geist-sans)`
- `antialiased` — Tailwind class for smoother font rendering

---

### 13. Home Page

**`portfolio-dashboard/app/page.tsx`**

```ts
import Dashboard from "@/components/Dashboard";

const Home = () => (
  <div className="min-h-screen bg-slate-50">
    <Dashboard />
  </div>
);

export default Home;
```

- This is a Server Component (no `"use client"`)
- `min-h-screen` — takes at least full viewport height
- `bg-slate-50` — light gray background
- `Dashboard` is a Client Component (has `"use client"`) — Next.js handles the boundary automatically

---

### 14. Dashboard Component

**`portfolio-dashboard/components/Dashboard.tsx`**

```ts
"use client";
```

- Needs `"use client"` because it uses `usePortfolio` (which uses `useState`, `useEffect`)

```ts
const Dashboard = () => {
  const { data, loading, error, lastUpdated, refresh } = usePortfolio();
  const hasData = data.length > 0;
```

- Destructures all values from the custom hook
- `hasData` — avoids repeating `data.length > 0` multiple times

```ts
  return (
    <>
      <Header loading={loading} lastUpdated={lastUpdated} onRefresh={refresh} />

      <main className="px-3 py-4 sm:px-6 sm:py-6">
        {hasData && <SummaryCards data={data} />}
        {error && <ErrorBanner error={error} onRetry={refresh} />}
        {loading && !hasData && <LoadingState />}
        {hasData && <PortfolioTable data={data} />}
```

- `<>` (Fragment) — groups elements without adding a DOM node
- Conditional rendering patterns:
  - `{hasData && <X />}` — render X only if truthy (short-circuit evaluation)
  - `{loading && !hasData && <LoadingState />}` — show spinner only on first load (not during background refresh)
- Error banner shows alongside data (not instead of) — user sees stale data + error message

---

### 15. Header

**`portfolio-dashboard/components/Header.tsx`**

```ts
const Header = ({ loading, lastUpdated, onRefresh }: HeaderProps) => (
  <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
```

- `sticky top-0` — sticks to top of viewport when scrolling
- `z-10` — stays above other content when sticky

```ts
        <button
          onClick={onRefresh}
          disabled={loading}
          className="... disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`... ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
```

- `disabled={loading}` — prevents double-clicking while fetching
- `disabled:opacity-50` — Tailwind variant: makes button 50% transparent when disabled
- `animate-spin` — Tailwind animation: rotates the icon continuously while loading

---

### 16. Summary Cards & SummaryCard

**`portfolio-dashboard/components/SummaryCards.tsx`**

```ts
  const totals = useMemo(() => {
    const invested = data.reduce((sum, s) => sum + s.investment, 0);
    const present = data.reduce((sum, s) => sum + s.presentValue, 0);
    const gl = present - invested;
    const glPct = invested > 0 ? ((gl / invested) * 100).toFixed(2) : "0";
    return { invested, present, gl, glPct };
  }, [data]);
```

- `useMemo` — recalculates only when `data` changes (not on every render)
- Two `reduce` passes: one for total investment, one for total present value
- `glPct` — gain/loss as a percentage of total investment

**`portfolio-dashboard/components/SummaryCard.tsx`**

```ts
const SummaryCard = memo(({ label, value, compactValue, subValue, variant }: SummaryCardProps) => {
```

- `memo` — skips re-rendering if props haven't changed
- Useful here because 4 cards are rendered and parent recalculates totals on each data refresh

```ts
      <p className={`text-sm font-bold mt-0.5 sm:hidden tabular-nums ${color}`}>{compactValue}</p>
      <p className={`text-xl font-bold mt-1 hidden sm:block tabular-nums ${color}`}>{value}</p>
```

- `sm:hidden` / `hidden sm:block` — show compact on mobile, full on desktop
- `tabular-nums` — Tailwind class that makes all digits the same width (numbers don't jump around)

---

### 17. Error Banner

**`portfolio-dashboard/components/ErrorBanner.tsx`**

```ts
const ErrorBanner = ({ error, onRetry }: ErrorBannerProps) => (
  <div className="... rounded-lg bg-red-50 border border-red-200 ... text-red-700">
    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
```

- `shrink-0` — prevents the icon from shrinking if text is long (flexbox behavior)
- Red color scheme for error state

---

### 18. Loading State

**`portfolio-dashboard/components/LoadingState.tsx`**

```ts
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-16 sm:py-20">
    <RefreshCw className="... animate-spin text-slate-400 mb-3" />
```

- Simple centered spinner with text
- Only shown during initial load (not background refreshes)

---

### 19. Portfolio Table

**`portfolio-dashboard/components/PortfolioTable.tsx`**

This is the largest component. Key sections:

**Small helper components (no memo needed — they're tiny):**

```ts
const GainLossCell = ({ value }: { value: number }) => {
  const isGain = value >= 0;
  return (
    <span className={`... ${isGain ? "text-emerald-600" : "text-red-600"}`}>
      {isGain ? <ArrowUpRight /> : <ArrowDownRight />}
      {formatCurrency(value)}
    </span>
  );
};
```

- Green with up arrow for gains, red with down arrow for losses

```ts
const ExchangeBadge = ({ symbol }: { symbol: string }) => {
  const isNSE = symbol.includes(".NS") || symbol.includes(".NSE");
  const exchange = isNSE ? "NSE" : symbol.includes(".BO") || symbol.includes(".BSE") ? "BSE" : "---";
```

- Determines exchange from the symbol suffix
- Blue badge for NSE, amber for BSE

**Mobile card (memo'd — rendered in a loop):**

```ts
const MobileStockCard = memo(({ stock }: { stock: StockData }) => {
```

- `memo` makes sense here — rendered 26 times in a `.map()`, and individual stock objects are stable between refreshes

**TanStack Table column definitions:**

```ts
const columns: ColumnDef<StockData>[] = [
  {
    accessorKey: "name",       // which field from StockData
    header: "Particulars",     // column header text
    size: 140,                 // fixed width in pixels
    cell: ({ row }) => (...)   // custom render function
  },
  // ... 10 more columns
];
```

- `accessorKey` — tells TanStack Table which data field to use
- `size` — used with `table-fixed` CSS for predictable widths
- `cell` — custom renderer. `getValue<number>()` gets the typed value for that cell

**Desktop table with sector grouping:**

```ts
const DesktopTable = ({ data }: { data: StockData[] }) => {
  const sectors = useMemo(() => groupBySector(data), [data]);

  const totals = useMemo(() => {
    const totalInvestment = data.reduce((sum, s) => sum + s.investment, 0);
    const totalPresentValue = data.reduce((sum, s) => sum + s.presentValue, 0);
    return { totalInvestment, totalPresentValue, gainLoss: totalPresentValue - totalInvestment };
  }, [data]);
```

- Two `useMemo` calls — only recalculate when data changes
- `sectors` — groups stocks by sector for the header rows
- `totals` — grand total row values

```ts
const SectorGroup = ({ summary }: { summary: SectorSummary }) => {
  const table = useReactTable({
    data: summary.stocks,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
```

- Each sector creates its own TanStack Table instance
- `getCoreRowModel()` — the basic row model (no sorting, filtering, etc.)
- This pattern gives us sector header rows that TanStack doesn't natively support

**Responsive switch:**

```ts
const PortfolioTable = ({ data }: PortfolioTableProps) => (
  <>
    <div className="block lg:hidden">
      <MobileView data={data} />
    </div>
    <div className="hidden lg:block">
      <DesktopTable data={data} />
    </div>
  </>
);
```

- Both views are in the DOM but CSS hides one based on screen size
- `lg:hidden` — hidden on large screens (shows on mobile)
- `hidden lg:block` — hidden by default, shown on large screens

---

## Architecture Decisions

| Decision | Why |
|---|---|
| **Express backend separate from Next.js** | Backend does heavy scraping (axios + cheerio). Keeping it separate means it can be scaled/deployed independently |
| **Next.js API route as proxy** | Hides backend URL from browser, avoids CORS, enables server-side caching |
| **Two-layer caching** | Next.js route caches for 10s (reduces backend calls), backend rate-limits at 4/min (prevents abuse) |
| **`Promise.all` for parallel fetching** | 26 stocks fetched simultaneously instead of sequentially (3s vs 52s) |
| **Cheerio over Puppeteer** | Puppeteer launches Chrome (slow, memory-heavy). Cheerio parses raw HTML (~200ms per stock) |
| **`useRef` over `setInterval`** | `setTimeout` + recursion gives control over timing (waits for API response before scheduling next) |
| **`memo` only on list items** | Only `MobileStockCard` and `SummaryCard` are memoized — they render in loops. Other components get new props every 15s anyway |
| **`useMemo` for calculations** | `groupBySector` and total calculations skip recomputation when data hasn't changed |
| **Indian number formatting** | `Intl.NumberFormat("en-IN")` uses lakh/crore system (1,00,000 not 100,000) |
| **Compact currency on mobile** | `₹74.50L` fits in card, `₹74,50,000.00` doesn't |

---

## Common Interview Questions

**Q: Why not use a single API call directly from the browser to Express?**
A: CORS issues, exposes backend URL, can't do server-side caching. The Next.js proxy solves all three.

**Q: Why `setTimeout` recursion instead of `setInterval`?**
A: `setInterval` fires every 15s regardless of whether the previous request finished. If the API is slow (takes 5s), intervals stack up. `setTimeout` after completion ensures exactly 15s gap between requests finishing and next one starting.

**Q: Why is `useCallback` needed for `load`, `scheduleNext`, `stopAutoRefresh`?**
A: Without `useCallback`, these functions get new identities on every render. Since they're in the `useEffect` dependency array, the effect would re-run on every render, creating infinite loops.

**Q: Why `useRef` for `cancelledRef` instead of state?**
A: State updates trigger re-renders. We just need a flag to check inside async callbacks — `useRef` gives us a mutable value without causing re-renders.

**Q: Why scrape Google Finance instead of using an API?**
A: Google Finance doesn't have a public API. Yahoo Finance has one (via npm package) but doesn't provide P/E ratio. Google Finance's "About" sidebar and "Financials" table are server-rendered in the initial HTML, making them scrapable without a headless browser.

**Q: What's the risk with Google Finance scraping?**
A: The CSS class names (`.gyFHrc`, `.P6K39c`) are obfuscated and can change when Google updates their frontend. The scraper would need to be updated if this happens.

**Q: Why `table-fixed` layout?**
A: With `table-auto` (default), column widths are determined by content — long stock names push everything. `table-fixed` respects the explicit `size` we set on each column definition.

**Q: Where does `memo` actually help vs where it doesn't?**
A: `memo` helps when: (1) component renders in a `.map()` loop with stable props, (2) parent re-renders frequently but this child's props don't change. It doesn't help when: props change every render (like `loading` changing every 15s), component is rendered once, or component is tiny (comparison overhead > render cost).

---

**Author:** Boobathi Thillan
**Assignment:** Octa Byte AI Pvt Ltd — Dynamic Portfolio Dashboard Case Study
