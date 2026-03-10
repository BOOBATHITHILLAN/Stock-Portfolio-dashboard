# Dynamic Portfolio Dashboard

A real-time stock portfolio tracking application that fetches live market data from **Yahoo Finance** (CMP) and **Google Finance** (P/E Ratio, Latest Earnings) and displays it in a responsive, sector-grouped dashboard.

**Built as a case study assignment for Octa Byte AI Pvt Ltd.**

---

## Table of Contents

1. [Project Architecture](#project-architecture)
2. [Tech Stack](#tech-stack)
3. [Data Flow](#data-flow)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Backend Challenges & Solutions](#backend-challenges--solutions)
7. [Frontend Challenges & Solutions](#frontend-challenges--solutions)
8. [Setup & Installation](#setup--installation)
9. [API Reference](#api-reference)

---

## Project Architecture

```
Portfolio-Dashboard/
├── portfolio-backend/          # Express.js REST API (Port 5000)
│   ├── src/
│   │   ├── server.ts           # Express server entry point
│   │   ├── controllers/
│   │   │   └── portfolioController.ts  # Main API handler
│   │   ├── utils/
│   │   │   ├── stock.ts        # Yahoo + Google orchestration
│   │   │   └── scraper.ts      # Google Finance HTML scraper
│   │   ├── types/
│   │   │   ├── stockTypes.ts   # StockInput, StockData interfaces
│   │   │   └── response.ts     # ApiResponse type
│   │   └── mockdata/
│   │       └── mockStocks.ts   # 26 stocks across 6 sectors
│   └── package.json
│
├── portfolio-dashboard/        # Next.js 16 Frontend (Port 3000)
│   ├── app/
│   │   ├── page.tsx            # Main dashboard page
│   │   └── api/stocks/
│   │       └── route.ts        # API proxy to backend
│   ├── components/
│   │   └── PortfolioTable.tsx  # Desktop table + Mobile cards
│   ├── hooks/
│   │   └── usePortfolio.ts     # Auto-refresh data hook (15s)
│   ├── lib/
│   │   └── utils.ts            # Formatting & grouping utilities
│   ├── types/
│   │   └── Stock.ts            # Frontend type definitions
│   └── .env.local              # API_URL=http://localhost:5000
│
└── README.md                   # This file
```

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express 5** | REST API server |
| **TypeScript** | Type safety |
| **yahoo-finance2** | Live CMP (Current Market Price) |
| **axios + cheerio** | Google Finance HTML scraping |
| **tsx** | TypeScript execution (dev & prod) |

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 16** (App Router) | React framework with API routes |
| **React 19** | UI library |
| **TanStack React Table v8** | Desktop data table with column definitions |
| **Tailwind CSS v4** | Utility-first styling |
| **Lucide React** | Icons (RefreshCw, TrendingUp, etc.) |
| **axios** | HTTP client for API proxy |

---

## Data Flow

```
┌─────────────┐    fetch("/api/stocks")    ┌──────────────────┐
│   Browser    │ ──────────────────────────▶│  Next.js API     │
│  (React UI)  │                            │  /api/stocks     │
│              │◀────────────────────────── │  (route.ts)      │
└─────────────┘    JSON response            └────────┬─────────┘
                                                     │ axios.get
                                                     ▼
                                            ┌──────────────────┐
                                            │  Express Backend  │
                                            │  /api/portfolio   │
                                            │  (Port 5000)      │
                                            └────────┬─────────┘
                                                     │ Promise.all
                                          ┌──────────┴──────────┐
                                          ▼                     ▼
                                   ┌─────────────┐     ┌────────────────┐
                                   │Yahoo Finance│     │ Google Finance  │
                                   │  (npm lib)  │     │ (HTML scraper) │
                                   │             │     │                │
                                   │ Returns:    │     │ Returns:       │
                                   │ • CMP       │     │ • P/E Ratio    │
                                   │             │     │ • Net Income   │
                                   │             │     │ • Market Cap   │
                                   │             │     │ • EPS          │
                                   └─────────────┘     └────────────────┘
```

**Why two data sources?**
- **Yahoo Finance** provides reliable real-time CMP via the `yahoo-finance2` npm package
- **Google Finance** provides P/E Ratio and financial metrics that are server-rendered in HTML, making them scrapable without a headless browser

**Why a Next.js API proxy?**
- The Express backend runs on port 5000; the Next.js frontend on port 3000
- Instead of exposing the backend URL to the browser (CORS issues, security), we proxy through `/api/stocks`
- The `API_URL` env var is server-side only (no `NEXT_PUBLIC_` prefix), keeping the backend URL private

---

## Backend Implementation

### Stock Data Pipeline

1. **Mock portfolio** (`mockStocks.ts`) defines 26 stocks with symbol, name, sector, qty, buyPrice
2. **Controller** (`portfolioController.ts`) iterates all stocks via `Promise.all`
3. **Stock utility** (`stock.ts`) fetches Yahoo CMP + Google metrics **in parallel** for each stock
4. **Scraper** (`scraper.ts`) parses Google Finance HTML with Cheerio CSS selectors
5. Controller calculates `portfolioWeight` as percentage of total present value

### Key Backend Files

| File | Responsibility |
|---|---|
| `scraper.ts` | Google Finance HTML parsing with CSS selectors |
| `stock.ts` | Orchestrates Yahoo + Google API calls in parallel |
| `portfolioController.ts` | Portfolio calculation & API response |
| `stockTypes.ts` | TypeScript interfaces for StockInput & StockData |
| `mockStocks.ts` | 26 hardcoded stock holdings across 6 sectors |

---

## Frontend Implementation

### Component Architecture

| Component/File | Purpose |
|---|---|
| `page.tsx` | Main dashboard: header, 4 summary cards, loading/error states |
| `PortfolioTable.tsx` | Responsive: Desktop table (lg+) / Mobile cards (<lg) |
| `usePortfolio.ts` | Custom hook: fetch, auto-refresh every 15s, loading/error state |
| `utils.ts` | `formatCurrency`, `formatCompactCurrency`, `groupBySector` |
| `api/stocks/route.ts` | Next.js API route proxying to Express backend |

### Key Frontend Features

- **11-column desktop table** with TanStack React Table: Particulars, Price, Qty, Investment, Wt%, Exchange, CMP, Present Value, Gain/Loss, P/E, Earnings
- **Sector grouping** with blue header rows showing sector totals
- **Grand total row** in dark header style
- **Mobile card layout** with 3-column grid per stock card
- **Auto-refresh** every 15 seconds with visual indicator
- **Summary cards** showing Total Investment, Present Value, Gain/Loss (with %), Holdings count
- **Compact currency** on mobile: ₹74.50L instead of ₹74,50,000.00

---

## Backend Challenges & Solutions

### Challenge 1: Google Finance Doesn't Return Data in Raw HTML (JavaScript Rendering)

**Problem:** The initial scraper used `axios` to fetch Google Finance pages and regex patterns to extract values. Every field returned `"N/A"` because Google Finance renders most of its content via JavaScript — the raw HTML response contains empty containers.

**What I tried:**
- `axios` + regex on raw HTML → All values `"N/A"`
- Fetched page source and inspected → Confirmed data is injected by JS after page load

**Solution:** After extensive HTML analysis, I discovered that **two specific sections** on Google Finance pages ARE server-rendered in the initial HTML:

1. **"About" section** (company info sidebar) — contains P/E Ratio, Market Cap, Dividend Yield, Year Range
2. **"Financials" table** (income statement) — contains Revenue, Net Income, EPS

These sections are rendered server-side because they're static reference data, unlike the live price ticker.

---

### Challenge 2: Discovering the Correct CSS Selectors

**Problem:** Even after knowing the data exists in raw HTML, finding the exact CSS selectors was difficult. Google Finance uses obfuscated class names (like `.gyFHrc`, `.mfs7Fc`, `.P6K39c`) that aren't human-readable.

**What I tried:**
- Standard selectors like `[data-field="pe_ratio"]` → didn't exist
- Regex pattern matching like `"P/E ratio","([^"]+)"` → matched tooltip **descriptions** instead of values (e.g., "The ratio of current share price..." instead of "17.17")

**Solution:** I wrote a debug script that:
1. Dumped the full HTML to a file
2. Searched for known values (e.g., the P/E value "17.17")
3. Traced back to the parent elements to find the CSS class pattern

**Discovered selectors:**

| Section | Parent Class | Label Class | Value Class |
|---|---|---|---|
| About (sidebar) | `.gyFHrc` | `.mfs7Fc` | `.P6K39c` |
| Financials (table) | `.roXhBd` | `.rsPbEe` | `.QXDnM` |

```typescript
// About section - P/E, Market Cap, etc.
$(".gyFHrc").each((_, row) => {
  const label = $(row).find(".mfs7Fc").text().trim();  // "P/E ratio"
  const value = $(row).find(".P6K39c").text().trim();  // "17.17"
});

// Financials table - Revenue, Net Income, EPS
$(".roXhBd").each((_, row) => {
  const label = $(row).find(".rsPbEe").text().trim();  // "Net income"
  const value = $(row).find(".QXDnM").text().trim();  // "₹64,062.00Cr"
});
```

> **Risk:** These obfuscated class names can change when Google updates their frontend. This is a known limitation of HTML scraping.

---

### Challenge 3: Yahoo Finance Symbol Format Mismatch

**Problem:** The mock data used symbols like `HDFCBANK.NSE`, but Yahoo Finance expects `HDFCBANK.NS`. And for Google Finance, the format is entirely different: `HDFCBANK:NSE`.

**Error:** `Quote not found for symbol: HDFCBANK.NSE`

**Solution:** Symbol normalization layer in `scraper.ts`:

| Source | NSE Format | BSE Format |
|---|---|---|
| Mock Data | `HDFCBANK.NSE` or `HDFCBANK.NS` | `532174.BO` or `532174.BSE` |
| Yahoo Finance | `HDFCBANK.NS` | `532174.BO` |
| Google Finance | `HDFCBANK:NSE` | `532174:BOM` |

```typescript
// Convert to Google Finance format
if (symbol.endsWith(".NS") || symbol.endsWith(".NSE")) {
  googleSymbol = symbol.replace(/\.(NS|NSE)$/, "") + ":NSE";
} else if (symbol.endsWith(".BO") || symbol.endsWith(".BSE")) {
  googleSymbol = symbol.replace(/\.(BO|BSE)$/, "") + ":BOM";
}
```

---

### Challenge 4: BSE Stocks Use Numeric Codes

**Problem:** BSE stocks like ICICI Bank use numeric codes (`532174.BO`) instead of ticker names. Yahoo Finance handles these fine, but Google Finance URLs with numeric BSE codes sometimes return incomplete data.

**Solution:** Graceful fallback — if Google returns `null`, all metric fields default to `"N/A"`:

```typescript
peRatio: google?.peRatio ?? "N/A",
latestEarnings: google?.netIncome ?? "N/A",
```

---

### Challenge 5: Puppeteer Was Not Viable

**Problem:** To get JS-rendered data, I initially tried Puppeteer (headless Chrome). It worked but **blocked the Express server from starting** because launching a browser instance consumed the event loop and took 5-10 seconds per stock.

**Why it failed:**
- Launches a full Chrome browser per request
- 26 stocks × ~8 seconds each = ~3.5 minutes per refresh
- Server became unresponsive during scraping
- Memory usage spiked to 2GB+

**Solution:** Abandoned Puppeteer entirely. Used `axios` + `cheerio` (pure HTTP + HTML parsing) which completes in ~200ms per stock and doesn't block the server.

---

### Challenge 6: Regex Matched Tooltip Descriptions Instead of Values

**Problem:** When using regex to extract P/E ratio, the pattern `"P/E ratio","([^"]+)"` matched the tooltip description text ("The ratio of current share price to per-share earnings...") instead of the actual numeric value ("17.17").

This happened because Google Finance's HTML contains the description text before the value, and regex is greedy by default.

**Solution:** Switched from regex to CSS selector-based extraction with Cheerio, which targets specific DOM elements by class name and is immune to text ordering issues.

---

### Challenge 7: "Latest Earnings" Field Confusion

**Problem:** The required field "Latest Earnings" was initially mapped to a non-existent `google.earnings` property, always returning `"N/A"`.

**Investigation:**
- The "Earnings" TAB on Google Finance (showing Normalized EPS, Last Report Date) is **JS-rendered** — not available in raw HTML
- But the "Financials" TABLE (showing Revenue, Net Income) **IS server-rendered**

**Solution:** Mapped `latestEarnings` to `google?.netIncome` (Net Income from the financials table), which represents the company's most recent earnings figure.

---

## Frontend Challenges & Solutions

### Challenge 1: 11 Columns Don't Fit on Screen

**Problem:** The table has 11 columns (Particulars, Price, Qty, Investment, Wt%, Exchange, CMP, Present Value, Gain/Loss, P/E, Earnings). With default column widths, the table overflowed horizontally and looked broken.

**What I tried:**
- Default `auto` table layout → columns were too wide, horizontal scrollbar appeared
- Reducing font size alone → still overflowed

**Solution:** Combined multiple techniques:
- `table-fixed` layout with explicit `size` on each column definition
- `text-xs` (12px) font size for all table cells
- Compact column headers: "Present Val" instead of "Present Value", "Exch" instead of "Exchange"
- Tight padding: `px-2 py-2` instead of default `px-4 py-3`
- Container with `overflow-x-auto` as a safety net

```typescript
const columns: ColumnDef<StockData>[] = [
  { accessorKey: "name", header: "Particulars", size: 140 },
  { accessorKey: "buyPrice", header: "Price", size: 80 },
  { accessorKey: "qty", header: "Qty", size: 40 },
  // ... compact sizes for all 11 columns
];
```

---

### Challenge 2: Mobile Layout Was Unusable

**Problem:** The 11-column table was completely unreadable on mobile devices. Even with horizontal scroll, users had to scroll extensively to see all data.

**Solution:** Implemented a **dual-layout** approach using Tailwind responsive classes:

- **Desktop (lg and above):** TanStack React Table with sector-grouped rows
- **Mobile (below lg):** Card-based layout with a 3-column grid per stock

```tsx
// PortfolioTable.tsx
export default function PortfolioTable({ data }: PortfolioTableProps) {
  return (
    <>
      <div className="block lg:hidden">
        <MobileView data={data} />    {/* Card layout */}
      </div>
      <div className="hidden lg:block">
        <DesktopTable data={data} />   {/* Table layout */}
      </div>
    </>
  );
}
```

Each mobile card shows: stock name, symbol, exchange badge, CMP (top), then a 3-column grid with Buy Price, Qty, Wt%, Investment, Present Value, Gain/Loss, P/E, Latest Earnings.

---

### Challenge 3: Summary Card Values Overflowed on Mobile

**Problem:** The header summary cards displayed full Indian currency format (e.g., `₹74,50,000.00`) which overflowed the card boundaries on mobile screens.

**Solution:** Created `formatCompactCurrency()` utility that shows abbreviated values on mobile:

```typescript
export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000)    return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000)       return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
}
```

| Value | Full Format | Compact Format |
|---|---|---|
| 74,50,000 | ₹74,50,000.00 | ₹74.50L |
| 1,20,00,000 | ₹1,20,00,000.00 | ₹1.20Cr |
| 45,000 | ₹45,000.00 | ₹45.0K |

Uses Tailwind responsive classes to switch:
- `sm:hidden` — shows compact value on mobile
- `hidden sm:block` — shows full value on desktop

---

### Challenge 4: API Architecture Decision

**Problem:** Initially created a separate `lib/api.ts` file for API calls. But the user wanted the API logic inside the `app/api/` folder following Next.js conventions, and the frontend should use `fetch()` to hit the Next.js API route.

**Solution:**
- Created `app/api/stocks/route.ts` as a Next.js API route that proxies to the Express backend
- Frontend hook uses `fetch("/api/stocks")` — no external URL exposed to the browser
- The Express backend URL (`http://localhost:5000`) is only in `.env.local` as a server-side variable

```
Browser → fetch("/api/stocks") → Next.js route.ts → axios → Express :5000
```

This gives us:
- No CORS issues (same-origin request from browser)
- Backend URL hidden from client
- Easy to swap backend URL in production via environment variables

---

### Challenge 5: Sector Grouping with Summary Rows

**Problem:** Stocks needed to be grouped by sector with a summary header row showing sector-level totals (Investment, Present Value, Gain/Loss). TanStack Table doesn't natively support grouped header rows mixed with data rows.

**Solution:** Instead of using TanStack Table's built-in grouping, I:
1. Created a `groupBySector()` utility that groups stocks into `SectorSummary` objects
2. Rendered each sector as a separate `<SectorGroup>` component containing:
   - A blue `<SectorHeader>` row spanning multiple columns with sector totals
   - Individual stock rows rendered by TanStack Table
3. A `GRAND TOTAL` row at the bottom with dark styling

This approach gives full control over the sector header styling while still using TanStack Table for individual row rendering.

---

### Challenge 6: Auto-Refresh Without Memory Leaks

**Problem:** The dashboard needs to refresh data every 15 seconds. Naive `setInterval` usage can cause memory leaks if the component unmounts, and multiple intervals can stack up.

**Solution:** Used `useRef` to store the interval ID and proper cleanup in `useEffect`:

```typescript
const intervalRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  load(true); // Initial load

  intervalRef.current = setInterval(() => load(false), REFRESH_INTERVAL);

  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };
}, [load]);
```

Key detail: `load(true)` shows the full loading spinner (initial load), while `load(false)` refreshes silently in the background without showing a loading state — so the table stays visible during auto-refresh.

---

## Setup & Installation

### Prerequisites
- Node.js >= 18
- npm or pnpm

### Backend Setup

```bash
cd portfolio-backend
npm install
npm run dev          # Starts on http://localhost:5000
```

### Frontend Setup

```bash
cd portfolio-dashboard
npm install
# Create .env.local with:
# API_URL=http://localhost:5000
npm run dev          # Starts on http://localhost:3000
```

### Production Build

```bash
# Backend
cd portfolio-backend
npm run build && npm start

# Frontend
cd portfolio-dashboard
npm run build && npm start
```

---

## API Reference

### `GET /api/portfolio` (Express Backend)

Returns all 26 stocks with live market data.

**Response:**
```json
{
  "status": "success",
  "message": "Portfolio updated successfully",
  "data": [
    {
      "symbol": "HDFCBANK.NSE",
      "name": "HDFC Bank",
      "sector": "Financial Sector",
      "qty": 50,
      "buyPrice": 1490,
      "cmp": 1856.50,
      "peRatio": "19.42",
      "latestEarnings": "₹64,062.00Cr",
      "investment": 74500,
      "presentValue": 92825,
      "gainLoss": 18325,
      "portfolioWeight": "5.23"
    }
  ]
}
```

### `GET /api/stocks` (Next.js Proxy)

Proxies to the Express backend. Same response format.

---

## Summary of All Difficulties

| # | Area | Difficulty | Resolution |
|---|---|---|---|
| 1 | Backend | Google Finance JS-renders most data | Found server-rendered sections (About + Financials) |
| 2 | Backend | Obfuscated CSS class names | Debug script to trace known values back to selectors |
| 3 | Backend | Yahoo/Google symbol format mismatch | Symbol normalization: `.NS`→`:NSE`, `.BO`→`:BOM` |
| 4 | Backend | BSE numeric codes missing data | Graceful null fallback to `"N/A"` |
| 5 | Backend | Puppeteer blocked server startup | Replaced with axios + cheerio (no browser needed) |
| 6 | Backend | Regex matched descriptions not values | Switched to CSS selector-based DOM parsing |
| 7 | Backend | "Latest Earnings" always N/A | Mapped to Net Income from Financials table |
| 8 | Frontend | 11 columns overflow on desktop | table-fixed layout + compact headers + text-xs |
| 9 | Frontend | Table unusable on mobile | Dual layout: table (desktop) / cards (mobile) |
| 10 | Frontend | Currency values overflow mobile cards | formatCompactCurrency (Cr/L/K notation) |
| 11 | Frontend | API file location convention | Moved to Next.js App Router api/stocks/route.ts |
| 12 | Frontend | Sector grouping in table | Custom SectorGroup component wrapping TanStack Table |
| 13 | Frontend | Auto-refresh memory leaks | useRef for interval + useEffect cleanup |

---

**Author:** Boobathi Thillan
**Assignment:** Octa Byte AI Pvt Ltd — Dynamic Portfolio Dashboard Case Study
