"use client";

import { RefreshCw } from "lucide-react";

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-16 sm:py-20">
    <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-slate-400 mb-3" />
    <p className="text-xs sm:text-sm text-slate-500">Loading portfolio data...</p>
    <p className="text-[10px] sm:text-xs text-slate-400 mt-1">
      Fetching from Yahoo Finance & Google Finance
    </p>
  </div>
);

export default LoadingState;
