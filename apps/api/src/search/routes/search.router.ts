import { Router } from "express";
import { search } from "../controllers/search.controller";
import { requireAuthContext, requirePermission } from "../../middleware/auth_context";

export const searchRouter = Router();
searchRouter.get("/", requireAuthContext, requirePermission("workspace:read"), search);
