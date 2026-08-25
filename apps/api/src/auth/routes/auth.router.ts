import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "../controllers/auth.controller";
import { requireAuthContext } from "../../middleware/auth_context";

export const authRouter = Router();

// Rate limiting for public auth endpoints (prevent brute-force attacks)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many authentication requests, please try again later",
    },
  },
});

// Public Authentication Endpoints
authRouter.post("/register", authLimiter, AuthController.register);
authRouter.post("/login", authLimiter, AuthController.login);
authRouter.post("/refresh", authLimiter, AuthController.refresh);

// Protected Authentication Endpoints
authRouter.post("/logout", requireAuthContext, AuthController.logout);
authRouter.get("/me", requireAuthContext, AuthController.me);
