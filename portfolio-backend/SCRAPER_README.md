# Google Finance Scraper - Development Journey

## Overview

The scraper (`src/utils/scraper.ts`) fetches stock financial metrics from Google Finance for the portfolio dashboard. It works alongside Yahoo Finance (`yahoo-finance2`) which provides the Current Market Price (CMP).

## Data Sources

| Field | Source |
|-------|--------|
| CMP (Current Market Price) | Yahoo Finance (`yahoo-finance2`) |
| P/E Ratio | Google Finance (About section) |
| Market Cap | Google Finance (About section) |
| Dividend Yield | Google Finance (About section) |
| 52-Week High/Low | Google Finance (About section → "Year range") |
| Revenue | Google Finance (Financials table) |
| Net Income (Latest Earnings) | Google Finance (Financials table) |
| EPS | Google Finance (Financials table) — often "—" for bank stocks |

## Challenges Faced & Solutions

### 1. Original Regex Approach Failed Completely

**Problem:** The first version used `axios` with simple regex patterns like `"P/E ratio","([^"]+)"` to extract data from the raw HTML.

**Why it failed:** Google Finance renders most of its content via JavaScript on the client side. A plain HTTP request (`axios.get`) returns minimal HTML with JavaScript bundles — not the rendered page content. The regex patterns had nothing to match against.

**Lesson:** Never assume a modern web page serves its data in the initial HTML response.

### 2. Yahoo Finance (`quoteSummary`) — Symbol Format Mismatch

**Problem:** Tried replacing Google scraper entirely with `yahoo-finance2`'s `quoteSummary` API. Stocks with `.NSE` suffix (e.g., `HDFCBANK.NSE`) threw "Quote not found" errors.

**Why it failed:** Yahoo Finance uses `.NS` for NSE and `.BO` for BSE (e.g., `HDFCBANK.NS`), while our database stored symbols as `.NSE`/`.BSE`.

**Solution:** Added symbol normalization (`.NSE` → `.NS`, `.BSE` → `.BO`). However, many BSE stocks using numeric codes (e.g., `543318.BO`) had no fundamentals data on Yahoo at all.

### 3. Yahoo Finance — No Fundamentals for Many BSE Stocks

**Problem:** `quoteSummary` with `defaultKeyStatistics`/`summaryDetail` modules returned "No fundamentals data found" for numerous BSE stocks.

**Why it failed:** Yahoo Finance doesn't have comprehensive fundamentals coverage for smaller/newer BSE-listed stocks.

**Solution:** Added null-safe access (`google?.peRatio ?? "N/A"`) so the app degrades gracefully instead of crashing.

### 4. Puppeteer — Blocked Server Startup

**Problem:** Since Google Finance data is JS-rendered, tried using Puppeteer (headless Chrome) to render the page and extract data from the DOM.

**Why it failed:** Puppeteer launches a full Chromium browser instance which:
- Consumed significant memory and CPU
- Blocked the Express server from starting up
- Was extremely slow for scraping 25+ stocks in parallel
- Overkill for a backend service

**Lesson:** Headless browsers are a last resort — always check if the data exists in the raw HTML first.

### 5. Cheerio Regex — Matched Tooltip Descriptions Instead of Values

**Problem:** Switched to `axios` + `cheerio` and used regex on `<script>` blocks. The pattern `"P/E ratio","([^"]+)"` was matching the **tooltip description** text ("The ratio of current share price to trailing twelve month EPS...") instead of the actual numeric value.

**Why it failed:** Google embeds both the label description and the value in the data. The regex greedily matched the first string after the label, which was the tooltip text.

**Solution:** Abandoned the regex-on-scripts approach entirely.

### 6. The Breakthrough — Inspecting the Actual HTML Structure

**Key discovery:** By dumping the raw HTML and searching for known values (e.g., the P/E value `17.17`), we found that:

**About Section** (P/E, Market Cap, etc.) IS server-rendered with this structure:
```html
<div class="gyFHrc">          <!-- parent row -->
  <span>
    <div class="mfs7Fc">P/E ratio</div>        <!-- label -->
    <div role="tooltip">...description...</div>  <!-- skip this -->
  </span>
  <div class="P6K39c">17.17</div>               <!-- actual value -->
</div>
```

**Financials Table** (Revenue, Net Income, etc.) IS also server-rendered:
```html
<tr class="roXhBd">
  <td class="J9Jhg">
    <div class="rsPbEe">Revenue</div>    <!-- label -->
  </td>
  <td class="QXDnM">774.85B</td>         <!-- value -->
</tr>
```

**Earnings Section** (Normalized EPS, Fiscal Period) is NOT server-rendered — it's loaded via JavaScript after page load. Cannot be scraped without a browser.

### 7. Symbol Format Conversion (Yahoo → Google)

**Problem:** Symbols stored in Yahoo format (`.NS`, `.BO`) needed conversion to Google format (`:NSE`, `:BOM`).

**Solution:**
```
.NS  or .NSE  →  :NSE   (e.g., HDFCBANK.NS → HDFCBANK:NSE)
.BO  or .BSE  →  :BOM   (e.g., 543318.BO  → 543318:BOM)
```

## Final Architecture

```
stock.ts (orchestrator)
├── Yahoo Finance (yf.quote)     → CMP (regularMarketPrice)
└── Google Finance (scraper.ts)  → P/E, Market Cap, Dividends,
                                    52-week range, Revenue, Net Income
```

Both APIs are called in parallel via `Promise.all`. If Google scraper fails for a stock, values gracefully default to `"N/A"`.

## CSS Selectors Reference (Google Finance)

These selectors may change if Google updates their UI:

| Section | Parent | Label Class | Value Class |
|---------|--------|-------------|-------------|
| About (metrics) | `.gyFHrc` | `.mfs7Fc` | `.P6K39c` |
| Financials (table) | `.roXhBd` | `.rsPbEe` | `.QXDnM` |

## Known Limitations

1. **EPS often unavailable** — Google Finance shows "—" for EPS on many Indian bank stocks
2. **CSS class dependency** — Google can change class names (`gyFHrc`, `P6K39c`, etc.) at any time, breaking the scraper
3. **Rate limiting risk** — Scraping 25+ stocks in rapid succession may trigger Google's bot detection
4. **Earnings tab data** — The "Normalized EPS / Estimate" and "Last report" data under the Earnings tab is JS-rendered and cannot be scraped without a headless browser
