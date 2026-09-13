import { Request, Response, NextFunction } from "express";
import { crmService } from "../services/crm.service";
import { AuthenticatedRequest } from "../../middleware/auth_context";
import {
  CreateLeadSchema,
  UpdateLeadSchema,
  ConvertLeadSchema,
  LeadQuerySchema,
  CreateCustomerSchema,
  UpdateCustomerSchema,
  CustomerQuerySchema,
  CreateContactSchema,
  UpdateContactSchema,
  ContactQuerySchema,
  CreateDealSchema,
  UpdateDealSchema,
  MoveDealSchema,
  DealQuerySchema,
  CreateCRMActivitySchema,
  UpdateCRMActivitySchema,
  CRMActivityQuerySchema,
} from "@omnidesk/validation";

export class CRMController {
  // ── Leads ─────────────────────────────────────────────────────────────────
  public async createLead(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateLeadSchema.parse(req.body);
      const lead = await crmService.createLead(
        authReq.context.workspaceId,
        {
          ...validated,
          expectedClose: validated.expectedClose ? new Date(validated.expectedClose) : undefined,
        },
        authReq.context.userId
      );
      res.status(201).json({ success: true, data: lead });
    } catch (err) {
      next(err);
    }
  }

  public async listLeads(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = LeadQuerySchema.parse(req.query);
      const result = await crmService.findLeadsPaginated(authReq.context.workspaceId, {
        query: query.query,
        stage: query.stage,
        status: query.status,
        source: query.source,
        priority: query.priority,
        assignedUserId: query.assignedUserId,
        isConverted: query.isConverted !== undefined ? query.isConverted === "true" : undefined,
        isArchived: query.isArchived !== undefined ? query.isArchived === "true" : undefined,
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });
      res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
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
      const lead = await crmService.updateLead(
        authReq.context.workspaceId,
        req.params.id,
        {
          ...validated,
          expectedClose: validated.expectedClose ? new Date(validated.expectedClose) : undefined,
        },
        authReq.context.userId
      );
      res.status(200).json({ success: true, data: lead });
    } catch (err) {
      next(err);
    }
  }

  public async convertLead(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = ConvertLeadSchema.parse(req.body);
      const result = await crmService.convertLead(
        authReq.context.workspaceId,
        req.params.id,
        validated,
        authReq.context.userId
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async archiveLead(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const archive = req.body.archive !== undefined ? Boolean(req.body.archive) : true;
      const lead = await crmService.archiveLead(authReq.context.workspaceId, req.params.id, archive, authReq.context.userId);
      res.status(200).json({ success: true, data: lead });
    } catch (err) {
      next(err);
    }
  }

  public async deleteLead(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await crmService.deleteLead(authReq.context.workspaceId, req.params.id, authReq.context.userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // ── Customers ─────────────────────────────────────────────────────────────
  public async createCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateCustomerSchema.parse(req.body);
      const customer = await crmService.createCustomer(authReq.context.workspaceId, validated, authReq.context.userId);
      res.status(201).json({ success: true, data: customer });
    } catch (err) {
      next(err);
    }
  }

  public async listCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = CustomerQuerySchema.parse(req.query);
      const result = await crmService.findCustomersPaginated(authReq.context.workspaceId, {
        query: query.query,
        industry: query.industry,
        status: query.status,
        isArchived: query.isArchived !== undefined ? query.isArchived === "true" : undefined,
        assignedUserId: query.assignedUserId,
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });
      res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
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
      const customer = await crmService.updateCustomer(authReq.context.workspaceId, req.params.id, validated, authReq.context.userId);
      res.status(200).json({ success: true, data: customer });
    } catch (err) {
      next(err);
    }
  }

  public async archiveCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const archive = req.body.archive !== undefined ? Boolean(req.body.archive) : true;
      const customer = await crmService.archiveCustomer(authReq.context.workspaceId, req.params.id, archive, authReq.context.userId);
      res.status(200).json({ success: true, data: customer });
    } catch (err) {
      next(err);
    }
  }

  public async deleteCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await crmService.deleteCustomer(authReq.context.workspaceId, req.params.id, authReq.context.userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // ── Contacts ──────────────────────────────────────────────────────────────
  public async createContact(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateContactSchema.parse(req.body);
      const contact = await crmService.createContact(authReq.context.workspaceId, validated, authReq.context.userId);
      res.status(201).json({ success: true, data: contact });
    } catch (err) {
      next(err);
    }
  }

  public async listContacts(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = ContactQuerySchema.parse(req.query);
      const result = await crmService.findContactsPaginated(authReq.context.workspaceId, {
        query: query.query,
        customerId: query.customerId,
        isPrimary: query.isPrimary !== undefined ? query.isPrimary === "true" : undefined,
        isArchived: query.isArchived !== undefined ? query.isArchived === "true" : undefined,
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });
      res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
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
      const contact = await crmService.updateContact(authReq.context.workspaceId, req.params.id, validated, authReq.context.userId);
      res.status(200).json({ success: true, data: contact });
    } catch (err) {
      next(err);
    }
  }

  public async archiveContact(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const archive = req.body.archive !== undefined ? Boolean(req.body.archive) : true;
      const contact = await crmService.archiveContact(authReq.context.workspaceId, req.params.id, archive, authReq.context.userId);
      res.status(200).json({ success: true, data: contact });
    } catch (err) {
      next(err);
    }
  }

  public async deleteContact(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await crmService.deleteContact(authReq.context.workspaceId, req.params.id, authReq.context.userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // ── Deals & Pipeline ──────────────────────────────────────────────────────
  public async createDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateDealSchema.parse(req.body);
      const deal = await crmService.createDeal(
        authReq.context.workspaceId,
        {
          ...validated,
          expectedClose: validated.expectedClose ? new Date(validated.expectedClose) : undefined,
        },
        authReq.context.userId
      );
      res.status(201).json({ success: true, data: deal });
    } catch (err) {
      next(err);
    }
  }

  public async listDeals(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = DealQuerySchema.parse(req.query);
      const result = await crmService.findDealsPaginated(authReq.context.workspaceId, {
        query: query.query,
        stage: query.stage,
        priority: query.priority,
        assignedUserId: query.assignedUserId,
        customerId: query.customerId,
        contactId: query.contactId,
        minAmount: query.minAmount,
        maxAmount: query.maxAmount,
        isArchived: query.isArchived !== undefined ? query.isArchived === "true" : undefined,
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });
      res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
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

  public async updateDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = UpdateDealSchema.parse(req.body);
      const deal = await crmService.updateDeal(
        authReq.context.workspaceId,
        req.params.id,
        {
          ...validated,
          expectedClose: validated.expectedClose ? new Date(validated.expectedClose) : undefined,
        },
        authReq.context.userId
      );
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
        validated.reason,
        authReq.context.userId
      );
      res.status(200).json({ success: true, data: deal });
    } catch (err) {
      next(err);
    }
  }

  public async archiveDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const archive = req.body.archive !== undefined ? Boolean(req.body.archive) : true;
      const deal = await crmService.archiveDeal(authReq.context.workspaceId, req.params.id, archive, authReq.context.userId);
      res.status(200).json({ success: true, data: deal });
    } catch (err) {
      next(err);
    }
  }

  public async deleteDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await crmService.deleteDeal(authReq.context.workspaceId, req.params.id, authReq.context.userId);
      res.status(200).json({ success: true, data: result });
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

  // ── CRM Dashboard Analytics ───────────────────────────────────────────────
  public async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const metrics = await crmService.getCRMDashboard(authReq.context.workspaceId);
      res.status(200).json({ success: true, data: metrics });
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

  public async listActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = CRMActivityQuerySchema.parse(req.query);
      const result = await crmService.findActivitiesPaginated(authReq.context.workspaceId, {
        entityType: query.entityType,
        entityId: query.entityId,
        type: query.type,
        isCompleted: query.isCompleted !== undefined ? query.isCompleted === "true" : undefined,
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });
      res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public async updateActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = UpdateCRMActivitySchema.parse(req.body);
      const activity = await crmService.updateActivity(
        authReq.context.workspaceId,
        req.params.id,
        {
          ...validated,
          dueDate: validated.dueDate ? new Date(validated.dueDate) : validated.dueDate === null ? null : undefined,
        },
        authReq.context.userId
      );
      res.status(200).json({ success: true, data: activity });
    } catch (err) {
      next(err);
    }
  }

  public async deleteActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await crmService.deleteActivity(authReq.context.workspaceId, req.params.id, authReq.context.userId);
      res.status(200).json({ success: true, data: result });
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
