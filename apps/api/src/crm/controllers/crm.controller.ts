import { Request, Response, NextFunction } from "express";
import { crmService } from "../services/crm.service";
import { AuthenticatedRequest } from "../../middleware/auth_context";
import {
  CreateLeadSchema,
  UpdateLeadSchema,
  CreateCustomerSchema,
  UpdateCustomerSchema,
  CreateContactSchema,
  UpdateContactSchema,
  CreateDealSchema,
  UpdateDealSchema,
  MoveDealSchema,
  CloseDealSchema,
  CreateCRMActivitySchema,
} from "@omnidesk/validation";

export class CRMController {
  // ── Leads ─────────────────────────────────────────────────────────────────
  public async createLead(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateLeadSchema.parse(req.body);
      const lead = await crmService.createLead(authReq.context.workspaceId, {
        ...validated,
        expectedClose: validated.expectedClose ? new Date(validated.expectedClose) : undefined,
      });
      res.status(201).json({ success: true, data: lead });
    } catch (err) {
      next(err);
    }
  }

  public async listLeads(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const { query, stage, priority, assignedUserId, limit } = req.query;
      const leads = await crmService.findLeads(authReq.context.workspaceId, {
        query: query as string,
        stage: stage as any,
        priority: priority as any,
        assignedUserId: assignedUserId as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.status(200).json({ success: true, data: leads });
    } catch (err) {
      next(err);
    }
  }

  public async getLead(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const lead = await crmService.getLead(authReq.context.workspaceId, req.params.id);
      res.status(200).json({ success: true, data: lead });
    } catch (err) {
      next(err);
    }
  }

  public async updateLead(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = UpdateLeadSchema.parse(req.body);
      const lead = await crmService.updateLead(authReq.context.workspaceId, req.params.id, {
        ...validated,
        expectedClose: validated.expectedClose ? new Date(validated.expectedClose) : undefined,
      });
      res.status(200).json({ success: true, data: lead });
    } catch (err) {
      next(err);
    }
  }

  // ── Customers ─────────────────────────────────────────────────────────────
  public async createCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateCustomerSchema.parse(req.body);
      const customer = await crmService.createCustomer(authReq.context.workspaceId, validated);
      res.status(201).json({ success: true, data: customer });
    } catch (err) {
      next(err);
    }
  }

  public async listCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const { query, industry, limit } = req.query;
      const customers = await crmService.findCustomers(authReq.context.workspaceId, {
        query: query as string,
        industry: industry as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.status(200).json({ success: true, data: customers });
    } catch (err) {
      next(err);
    }
  }

  public async getCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const customer = await crmService.getCustomer(authReq.context.workspaceId, req.params.id);
      res.status(200).json({ success: true, data: customer });
    } catch (err) {
      next(err);
    }
  }

  public async updateCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = UpdateCustomerSchema.parse(req.body);
      const customer = await crmService.updateCustomer(authReq.context.workspaceId, req.params.id, validated);
      res.status(200).json({ success: true, data: customer });
    } catch (err) {
      next(err);
    }
  }

  // ── Contacts ──────────────────────────────────────────────────────────────
  public async createContact(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateContactSchema.parse(req.body);
      const contact = await crmService.createContact(authReq.context.workspaceId, validated);
      res.status(201).json({ success: true, data: contact });
    } catch (err) {
      next(err);
    }
  }

  public async listContacts(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const { query, customerId, limit } = req.query;
      const contacts = await crmService.findContacts(authReq.context.workspaceId, {
        query: query as string,
        customerId: customerId as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.status(200).json({ success: true, data: contacts });
    } catch (err) {
      next(err);
    }
  }

  public async getContact(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const contact = await crmService.getContact(authReq.context.workspaceId, req.params.id);
      res.status(200).json({ success: true, data: contact });
    } catch (err) {
      next(err);
    }
  }

  public async updateContact(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = UpdateContactSchema.parse(req.body);
      const contact = await crmService.updateContact(authReq.context.workspaceId, req.params.id, validated);
      res.status(200).json({ success: true, data: contact });
    } catch (err) {
      next(err);
    }
  }

  // ── Deals & Pipeline ──────────────────────────────────────────────────────
  public async createDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateDealSchema.parse(req.body);
      const deal = await crmService.createDeal(authReq.context.workspaceId, {
        ...validated,
        expectedClose: validated.expectedClose ? new Date(validated.expectedClose) : undefined,
      });
      res.status(201).json({ success: true, data: deal });
    } catch (err) {
      next(err);
    }
  }

  public async listDeals(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const { query, stage, priority, minAmount, maxAmount, customerId, limit } = req.query;
      const deals = await crmService.findDeals(authReq.context.workspaceId, {
        query: query as string,
        stage: stage as any,
        priority: priority as any,
        minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined,
        customerId: customerId as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.status(200).json({ success: true, data: deals });
    } catch (err) {
      next(err);
    }
  }

  public async getDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const deal = await crmService.getDeal(authReq.context.workspaceId, req.params.id);
      res.status(200).json({ success: true, data: deal });
    } catch (err) {
      next(err);
    }
  }

  public async moveDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = MoveDealSchema.parse(req.body);
      const deal = await crmService.moveDeal(
        authReq.context.workspaceId,
        req.params.id,
        validated.targetStage,
        validated.reason
      );
      res.status(200).json({ success: true, data: deal });
    } catch (err) {
      next(err);
    }
  }

  public async getPipelineSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const summary = await crmService.getPipelineSummary(authReq.context.workspaceId);
      res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  public async getStaleDeals(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 14;
      const result = await crmService.getStaleDeals(authReq.context.workspaceId, days);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // ── Activities ────────────────────────────────────────────────────────────
  public async createActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateCRMActivitySchema.parse(req.body);
      const activity = await crmService.logActivity(authReq.context.workspaceId, {
        ...validated,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
        userId: authReq.context.userId,
      });
      res.status(201).json({ success: true, data: activity });
    } catch (err) {
      next(err);
    }
  }

  public async getOverdueFollowups(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await crmService.getOverdueFollowups(authReq.context.workspaceId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const crmController = new CRMController();
