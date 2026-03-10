"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { StockData, PortfolioResponse } from "@/types/Stock";

const REFRESH_INTERVAL = 15_000; // 15 seconds

export const usePortfolio = () => {
  const [data, setData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cancelledRef = useRef(false);

  const fetchPortfolio = useCallback(async () => {
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
      setError(
        err instanceof Error ? err.message : "Failed to connect to server"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleNext = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      await fetchPortfolio();
      if (!cancelledRef.current) scheduleNext();
    }, REFRESH_INTERVAL);
  }, [fetchPortfolio]);

  const stopAutoRefresh = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    fetchPortfolio().then(() => scheduleNext());

    return () => {
      cancelledRef.current = true;
      stopAutoRefresh();
    };
  }, [fetchPortfolio, scheduleNext, stopAutoRefresh]);

  const refresh = useCallback(async () => {
    stopAutoRefresh();
    await fetchPortfolio();
    scheduleNext();
  }, [fetchPortfolio, scheduleNext, stopAutoRefresh]);

  return { data, loading, error, lastUpdated, refresh };
};
