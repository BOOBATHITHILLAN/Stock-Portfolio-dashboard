import type { Request, Response } from "express";
import { ApiResponse } from "../types/response";
import { getUpdatedStockData } from "../utils/stock";
import { MOCK_STOCKS } from "../mockdata/mockStocks";

const processStockData = async (stock: (typeof MOCK_STOCKS)[number]) => {
  try {
    const stockData = await getUpdatedStockData(stock);
    await new Promise((resolve) => setTimeout(resolve, 200));
    return stockData;
  } catch (error) {
    console.error(`Error updating ${stock.symbol}:`, error);
    return null;
  }
};

export const getPortfolioData = async (req: Request, res: Response) => {
  try {
    const updatedPortfolio = [];
    for (const stock of MOCK_STOCKS) {
      const stockData = await processStockData(stock);
      if (stockData) {
        updatedPortfolio.push(stockData);
      }
    }

    const totalValue = updatedPortfolio.reduce(
      (sum, s) => sum + s.presentValue,
      0,
    );

    const finalData = updatedPortfolio.map((s) => ({
      ...s,
      portfolioWeight:
        totalValue > 0 ? ((s.presentValue / totalValue) * 100).toFixed(2) : "0",
    }));

    const response: ApiResponse<any> = {
      status: "success",
      message: "Portfolio updated successfully",
      data: finalData,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to process portfolio:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to process portfolio",
      data: null,
    });
  }
};
