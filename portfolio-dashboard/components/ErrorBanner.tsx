"use client";

import { AlertCircle } from "lucide-react";

type ErrorBannerProps = {
  error: string;
  onRetry: () => void;
};

const ErrorBanner = ({ error, onRetry }: ErrorBannerProps) => (
  <div className="mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 rounded-lg bg-red-50 border border-red-200 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-red-700">
    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
    <div className="min-w-0">
      <p className="font-medium">Failed to load portfolio data</p>
      <p className="text-[10px] sm:text-xs mt-0.5 truncate">{error}</p>
    </div>
    <button
      onClick={onRetry}
      className="ml-auto shrink-0 text-[10px] sm:text-xs font-medium underline hover:no-underline"
    >
      Retry
    </button>
  </div>
);

export default ErrorBanner;
