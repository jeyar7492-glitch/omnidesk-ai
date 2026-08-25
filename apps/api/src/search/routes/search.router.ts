import { Router } from "express";
import { SearchController } from "../controllers/search.controller";
import { requireAuthContext, requirePermission } from "../../middleware/auth_context";

export const searchRouter = Router();

// Apply authentication middleware
searchRouter.use(requireAuthContext);

// Workspace-scoped global search endpoint
searchRouter.get("/", requirePermission("workspace:read"), SearchController.search);
