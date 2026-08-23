import { Router } from "express";
import { crmController } from "../controllers/crm.controller";
import { requireAuthContext } from "../../middleware/auth_context";

export const crmRouter = Router();

// Apply workspace & auth context middleware to all CRM routes
crmRouter.use(requireAuthContext);

// Leads
crmRouter.post("/leads", (req, res, next) => crmController.createLead(req, res, next));
crmRouter.get("/leads", (req, res, next) => crmController.listLeads(req, res, next));
crmRouter.get("/leads/:id", (req, res, next) => crmController.getLead(req, res, next));
crmRouter.patch("/leads/:id", (req, res, next) => crmController.updateLead(req, res, next));

// Customers
crmRouter.post("/customers", (req, res, next) => crmController.createCustomer(req, res, next));
crmRouter.get("/customers", (req, res, next) => crmController.listCustomers(req, res, next));
crmRouter.get("/customers/:id", (req, res, next) => crmController.getCustomer(req, res, next));
crmRouter.patch("/customers/:id", (req, res, next) => crmController.updateCustomer(req, res, next));

// Contacts
crmRouter.post("/contacts", (req, res, next) => crmController.createContact(req, res, next));
crmRouter.get("/contacts", (req, res, next) => crmController.listContacts(req, res, next));
crmRouter.get("/contacts/:id", (req, res, next) => crmController.getContact(req, res, next));
crmRouter.patch("/contacts/:id", (req, res, next) => crmController.updateContact(req, res, next));

// Deals
crmRouter.post("/deals", (req, res, next) => crmController.createDeal(req, res, next));
crmRouter.get("/deals", (req, res, next) => crmController.listDeals(req, res, next));
crmRouter.get("/deals/:id", (req, res, next) => crmController.getDeal(req, res, next));
crmRouter.post("/deals/:id/move", (req, res, next) => crmController.moveDeal(req, res, next));

// Pipeline Analytics
crmRouter.get("/pipeline/summary", (req, res, next) => crmController.getPipelineSummary(req, res, next));
crmRouter.get("/pipeline/stale", (req, res, next) => crmController.getStaleDeals(req, res, next));
crmRouter.get("/pipeline/overdue-followups", (req, res, next) => crmController.getOverdueFollowups(req, res, next));

// Activities
crmRouter.post("/activities", (req, res, next) => crmController.createActivity(req, res, next));
