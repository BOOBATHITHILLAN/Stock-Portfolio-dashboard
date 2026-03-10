import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getPortfolioData } from "../controllers/portfolioController";

const router = Router();

// Allow max 4 requests per minute per IP
const portfolioLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 4,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many requests. Please try again after a minute.",
    data: null,
  },
});

router.get("/portfolio", portfolioLimiter, getPortfolioData);

export default router;
