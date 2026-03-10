"use client";

import { RefreshCw } from "lucide-react";

type HeaderProps = {
  loading: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
};

const Header = ({ loading, lastUpdated, onRefresh }: HeaderProps) => (
  <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
    <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
      <div>
        <h1 className="text-base sm:text-2xl font-bold text-slate-900">Portfolio Dashboard</h1>
        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 hidden sm:block">
          Real-time stock data from Yahoo Finance & Google Finance
        </p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {lastUpdated && (
          <span className="text-[10px] sm:text-xs text-slate-400 hidden sm:inline">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1 sm:gap-1.5 rounded-lg bg-slate-800 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
    </div>
  </header>
);

export default Header;
