import { Request, Response, NextFunction } from "express";
import { GlobalSearchQuerySchema } from "@omnidesk/validation";
import { AuthenticatedRequest } from "../../middleware/auth_context";
import { searchService } from "../services/search.service";

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest;
    const { q, limit } = GlobalSearchQuerySchema.parse(req.query);
    const data = await searchService.search(authReq.context.workspaceId, q, limit);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}
