import { NextResponse } from "next/server";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

let cachedData: unknown = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10_000; // 10 seconds

export const dynamic = "force-dynamic";

export const GET = async () => {
  try {
    const now = Date.now();

    if (cachedData && now - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json(cachedData, {
        headers: { "X-Cache": "HIT" },
      });
    }

    console.log(`Fetching stocks from: ${API_BASE}/api/portfolio`);
    const { data } = await axios.get(`${API_BASE}/api/portfolio`, {
      timeout: 30000,
    });

    cachedData = data;
    cacheTimestamp = now;

    return NextResponse.json(data, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (error) {
    console.error("Error fetching stocks:", error);
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: { "X-Cache": "STALE" },
      });
    }

    const message =
      error instanceof Error ? error.message : "Failed to fetch portfolio";
    return NextResponse.json(
      { status: "error", message, data: null },
      { status: 500 }
    );
  }
};
