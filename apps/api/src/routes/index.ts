import { Router } from "express";
import { healthRouter } from "./health.router";

export const v1Router = Router();

// Version 1 Routes
v1Router.use("/health", healthRouter);
