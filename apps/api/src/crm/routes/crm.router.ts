import { Router } from "express";
import { crmController } from "../controllers/crm.controller";
import { requireAuthContext, requirePermission } from "../../middleware/auth_context";

export const crmRouter = Router();

// Apply workspace & auth context middleware to all CRM routes
crmRouter.use(requireAuthContext);

// ── CRM Dashboard ───────────────────────────────────────────────────────────
crmRouter.get("/dashboard", requirePermission("crm:read"), (req, res, next) =>
  crmController.getDashboard(req, res, next)
);

// ── Leads ───────────────────────────────────────────────────────────────────
crmRouter.post("/leads", requirePermission("lead:write"), (req, res, next) =>
  crmController.createLead(req, res, next)
);
crmRouter.get("/leads", requirePermission("lead:read"), (req, res, next) =>
  crmController.listLeads(req, res, next)
);
crmRouter.get("/leads/:id", requirePermission("lead:read"), (req, res, next) =>
  crmController.getLead(req, res, next)
);
crmRouter.patch("/leads/:id", requirePermission("lead:write"), (req, res, next) =>
  crmController.updateLead(req, res, next)
);
crmRouter.post("/leads/:id/convert", requirePermission("lead:write"), (req, res, next) =>
  crmController.convertLead(req, res, next)
);
crmRouter.post("/leads/:id/archive", requirePermission("lead:write"), (req, res, next) =>
  crmController.archiveLead(req, res, next)
);
crmRouter.delete("/leads/:id", requirePermission("lead:write"), (req, res, next) =>
  crmController.deleteLead(req, res, next)
);

// ── Customers ───────────────────────────────────────────────────────────────
crmRouter.post("/customers", requirePermission("customer:write"), (req, res, next) =>
  crmController.createCustomer(req, res, next)
);
crmRouter.get("/customers", requirePermission("customer:read"), (req, res, next) =>
  crmController.listCustomers(req, res, next)
);
crmRouter.get("/customers/:id", requirePermission("customer:read"), (req, res, next) =>
  crmController.getCustomer(req, res, next)
);
crmRouter.patch("/customers/:id", requirePermission("customer:write"), (req, res, next) =>
  crmController.updateCustomer(req, res, next)
);
crmRouter.post("/customers/:id/archive", requirePermission("customer:write"), (req, res, next) =>
  crmController.archiveCustomer(req, res, next)
);
crmRouter.delete("/customers/:id", requirePermission("customer:write"), (req, res, next) =>
  crmController.deleteCustomer(req, res, next)
);

// ── Contacts ────────────────────────────────────────────────────────────────
crmRouter.post("/contacts", requirePermission("crm:write"), (req, res, next) =>
  crmController.createContact(req, res, next)
);
crmRouter.get("/contacts", requirePermission("crm:read"), (req, res, next) =>
  crmController.listContacts(req, res, next)
);
crmRouter.get("/contacts/:id", requirePermission("crm:read"), (req, res, next) =>
  crmController.getContact(req, res, next)
);
crmRouter.patch("/contacts/:id", requirePermission("crm:write"), (req, res, next) =>
  crmController.updateContact(req, res, next)
);
crmRouter.post("/contacts/:id/archive", requirePermission("crm:write"), (req, res, next) =>
  crmController.archiveContact(req, res, next)
);
crmRouter.delete("/contacts/:id", requirePermission("crm:write"), (req, res, next) =>
  crmController.deleteContact(req, res, next)
);

// ── Deals ───────────────────────────────────────────────────────────────────
crmRouter.post("/deals", requirePermission("deal:write"), (req, res, next) =>
  crmController.createDeal(req, res, next)
);
crmRouter.get("/deals", requirePermission("deal:read"), (req, res, next) =>
  crmController.listDeals(req, res, next)
);
crmRouter.get("/deals/:id", requirePermission("deal:read"), (req, res, next) =>
  crmController.getDeal(req, res, next)
);
crmRouter.patch("/deals/:id", requirePermission("deal:write"), (req, res, next) =>
  crmController.updateDeal(req, res, next)
);
crmRouter.post("/deals/:id/move", requirePermission("deal:write"), (req, res, next) =>
  crmController.moveDeal(req, res, next)
);
crmRouter.post("/deals/:id/stage", requirePermission("deal:write"), (req, res, next) =>
  crmController.moveDeal(req, res, next)
);
crmRouter.post("/deals/:id/archive", requirePermission("deal:write"), (req, res, next) =>
  crmController.archiveDeal(req, res, next)
);
crmRouter.delete("/deals/:id", requirePermission("deal:write"), (req, res, next) =>
  crmController.deleteDeal(req, res, next)
);

// ── Pipeline Analytics ──────────────────────────────────────────────────────
crmRouter.get("/pipeline/summary", requirePermission("crm:read"), (req, res, next) =>
  crmController.getPipelineSummary(req, res, next)
);
crmRouter.get("/pipeline/stale", requirePermission("crm:read"), (req, res, next) =>
  crmController.getStaleDeals(req, res, next)
);
crmRouter.get("/pipeline/overdue-followups", requirePermission("crm:read"), (req, res, next) =>
  crmController.getOverdueFollowups(req, res, next)
);

// ── Activities ──────────────────────────────────────────────────────────────
crmRouter.post("/activities", requirePermission("crm:write"), (req, res, next) =>
  crmController.createActivity(req, res, next)
);
crmRouter.get("/activities", requirePermission("crm:read"), (req, res, next) =>
  crmController.listActivities(req, res, next)
);
crmRouter.patch("/activities/:id", requirePermission("crm:write"), (req, res, next) =>
  crmController.updateActivity(req, res, next)
);
crmRouter.delete("/activities/:id", requirePermission("crm:write"), (req, res, next) =>
  crmController.deleteActivity(req, res, next)
);
