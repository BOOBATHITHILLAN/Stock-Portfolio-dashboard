import type { Request, Response } from "express";
import { ApiResponse } from "../types/response";
import { getUpdatedStockData } from "../utils/stock";
import { MOCK_STOCKS } from "../mockdata/mockStocks";

export const getPortfolioData = async (req: Request, res: Response) => {
  try {
    const updatedPortfolio = await Promise.all(
      MOCK_STOCKS.map((stock) => getUpdatedStockData(stock)),
    );

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
    res.status(500).json({
      status: "error",
      message: "Failed to process portfolio",
      data: null,
    });
  }
};
