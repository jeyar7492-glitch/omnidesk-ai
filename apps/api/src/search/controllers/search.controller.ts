import { Request, Response, NextFunction } from "express";
import { searchService } from "../services/search.service";
import { GlobalSearchQuerySchema } from "@omnidesk/validation";
import { AuthenticatedRequest } from "../../middleware/auth_context";

export class SearchController {
  public static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const workspaceId = authReq.context.workspaceId;

      const validated = GlobalSearchQuerySchema.parse({
        q: req.query.q,
        limit: req.query.limit,
        types: req.query.types,
      });

      const results = await searchService.search(workspaceId, validated.q, validated.limit);

      return res.status(200).json({
        success: true,
        data: results,
      });
    } catch (err) {
      next(err);
    }
  }
}
