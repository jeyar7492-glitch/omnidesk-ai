import { Router } from "express";
import { healthRouter } from "./health.router";
import { createAIRouter } from "../ai/routes/ai.router";

export const v1Router = Router();

// Version 1 Routes
v1Router.use("/health", healthRouter);
v1Router.use("/ai", createAIRouter());
