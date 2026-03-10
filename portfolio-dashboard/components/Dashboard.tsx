"use client";

import Header from "@/components/Header";
import SummaryCards from "@/components/SummaryCards";
import ErrorBanner from "@/components/ErrorBanner";
import LoadingState from "@/components/LoadingState";
import PortfolioTable from "@/components/PortfolioTable";
import { usePortfolio } from "@/hooks/usePortfolio";

const Dashboard = () => {
  const { data, loading, error, lastUpdated, refresh } = usePortfolio();

  return (
    <>
      <Header loading={loading} lastUpdated={lastUpdated} onRefresh={refresh} />

      <main className="px-3 py-4 sm:px-6 sm:py-6">
        {data.length > 0 && <SummaryCards data={data} />}

        {error && <ErrorBanner error={error} onRetry={refresh} />}

        {loading && data.length === 0 && <LoadingState />}

        {data.length > 0 && <PortfolioTable data={data} />}

        {data.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4">
            {lastUpdated && (
              <span className="text-[10px] text-slate-400 sm:hidden">
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <p className="text-[10px] sm:text-xs text-slate-400">
              Auto-refreshes every 15s
            </p>
          </div>
        )}
      </main>
    </>
  );
};

export default Dashboard;
