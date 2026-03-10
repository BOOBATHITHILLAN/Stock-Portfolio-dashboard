import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getPortfolioData } from "../controllers/portfolioController";

const router = Router();
const portfolioLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 4,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many requests. Please try again after a minute.",
    data: null,
  },
});

router.get("/portfolio", portfolioLimiter, getPortfolioData);

export default router;
