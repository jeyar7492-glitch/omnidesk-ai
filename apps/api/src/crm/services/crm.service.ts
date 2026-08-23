import { DealStage, PriorityLevel } from "@omnidesk/shared-types";
import { prisma } from "../../lib/prisma";
import { wsManager } from "../../lib/websocket";
import { NotFoundError, ValidationError } from "../../lib/errors";

export const VALID_DEAL_STAGES: DealStage[] = [
  "QUALIFICATION",
  "CONTACTED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

export const ALLOWED_DEAL_TRANSITIONS: Record<DealStage, DealStage[]> = {
  QUALIFICATION: ["CONTACTED", "PROPOSAL", "LOST"],
  CONTACTED: ["PROPOSAL", "QUALIFICATION", "LOST"],
  PROPOSAL: ["NEGOTIATION", "CONTACTED", "LOST"],
  NEGOTIATION: ["WON", "LOST", "PROPOSAL"],
  WON: ["NEGOTIATION"], // Re-opening only
  LOST: ["QUALIFICATION", "CONTACTED"], // Re-activating
};

export class CRMService {
  // ── Leads ─────────────────────────────────────────────────────────────────
  public async createLead(workspaceId: string, data: {
    title: string;
    customerId?: string;
    stage?: DealStage;
    dealValue?: number;
    probability?: number;
    expectedClose?: Date;
    priority?: PriorityLevel;
    assignedUserId?: string;
    notes?: string;
  }) {
    const lead = await prisma.lead.create({
      data: {
        workspaceId,
        title: data.title.trim(),
        customerId: data.customerId,
        stage: data.stage || "QUALIFICATION",
        dealValue: data.dealValue ?? 0.0,
        probability: data.probability ?? 20,
        expectedClose: data.expectedClose,
        priority: data.priority || "MEDIUM",
        assignedUserId: data.assignedUserId,
        notes: data.notes?.trim(),
      },
      include: {
        customer: { select: { companyName: true, email: true } },
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "crm:lead_created", {
      leadId: lead.id,
      title: lead.title,
      dealValue: lead.dealValue,
      stage: lead.stage,
      customer: lead.customer?.companyName || null,
      createdAt: lead.createdAt.toISOString(),
    });

    return lead;
  }

  public async findLeads(workspaceId: string, filter: {
    query?: string;
    stage?: DealStage;
    priority?: PriorityLevel;
    assignedUserId?: string;
    limit?: number;
  }) {
    const where: any = { workspaceId };
    if (filter.stage) where.stage = filter.stage;
    if (filter.priority) where.priority = filter.priority;
    if (filter.assignedUserId) where.assignedUserId = filter.assignedUserId;
    if (filter.query && filter.query.trim()) {
      const q = filter.query.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { customer: { is: { companyName: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      take: filter.limit || 20,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, companyName: true } },
      },
    });

    return leads;
  }

  public async getLead(workspaceId: string, leadIdOrTitle: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(leadIdOrTitle);
    const where: any = { workspaceId };

    if (isObjectId) {
      where.id = leadIdOrTitle;
    } else {
      where.title = { contains: leadIdOrTitle.trim(), mode: "insensitive" };
    }

    const lead = await prisma.lead.findFirst({
      where,
      include: {
        customer: true,
        deals: true,
      },
    });

    if (!lead) {
      throw new NotFoundError(`Lead '${leadIdOrTitle}' not found in workspace`);
    }

    return lead;
  }

  public async updateLead(workspaceId: string, leadId: string, data: {
    title?: string;
    stage?: DealStage;
    dealValue?: number;
    probability?: number;
    expectedClose?: Date;
    priority?: PriorityLevel;
    assignedUserId?: string;
    notes?: string;
  }) {
    const existing = await this.getLead(workspaceId, leadId);

    const updated = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        title: data.title?.trim(),
        stage: data.stage,
        dealValue: data.dealValue,
        probability: data.probability,
        expectedClose: data.expectedClose,
        priority: data.priority,
        assignedUserId: data.assignedUserId,
        notes: data.notes?.trim(),
      },
      include: {
        customer: { select: { companyName: true } },
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "crm:lead_updated", {
      leadId: updated.id,
      title: updated.title,
      stage: updated.stage,
      dealValue: updated.dealValue,
      updatedAt: updated.updatedAt.toISOString(),
    });

    return updated;
  }

  // ── Customers ─────────────────────────────────────────────────────────────
  public async createCustomer(workspaceId: string, data: {
    companyName: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    website?: string;
    industry?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    assignedUserId?: string;
  }) {
    const customer = await prisma.customer.create({
      data: {
        workspaceId,
        companyName: data.companyName.trim(),
        contactPerson: data.contactPerson?.trim(),
        email: data.email?.trim(),
        phone: data.phone?.trim(),
        website: data.website?.trim(),
        industry: data.industry?.trim(),
        address: data.address?.trim(),
        city: data.city?.trim(),
        state: data.state?.trim(),
        country: data.country?.trim(),
        assignedUserId: data.assignedUserId,
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "crm:customer_created", {
      customerId: customer.id,
      companyName: customer.companyName,
      industry: customer.industry,
      createdAt: customer.createdAt.toISOString(),
    });

    return customer;
  }

  public async findCustomers(workspaceId: string, filter: { query?: string; industry?: string; limit?: number }) {
    const where: any = { workspaceId };
    if (filter.industry) where.industry = { contains: filter.industry.trim(), mode: "insensitive" };
    if (filter.query && filter.query.trim()) {
      where.OR = [
        { companyName: { contains: filter.query.trim(), mode: "insensitive" } },
        { contactPerson: { contains: filter.query.trim(), mode: "insensitive" } },
        { email: { contains: filter.query.trim(), mode: "insensitive" } },
      ];
    }

    return prisma.customer.findMany({
      where,
      take: filter.limit || 20,
      orderBy: { createdAt: "desc" },
      include: {
        contacts: true,
        _count: { select: { deals: true, leads: true } },
      },
    });
  }

  public async getCustomer(workspaceId: string, customerIdOrName: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(customerIdOrName);
    const where: any = { workspaceId };

    if (isObjectId) {
      where.id = customerIdOrName;
    } else {
      where.companyName = { contains: customerIdOrName.trim(), mode: "insensitive" };
    }

    const customer = await prisma.customer.findFirst({
      where,
      include: {
        contacts: true,
        deals: true,
        leads: true,
      },
    });

    if (!customer) {
      throw new NotFoundError(`Customer '${customerIdOrName}' not found in workspace`);
    }

    return customer;
  }

  public async updateCustomer(workspaceId: string, customerId: string, data: Partial<{
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    website: string;
    industry: string;
    address: string;
    city: string;
    state: string;
    country: string;
    status: string;
  }>) {
    const existing = await this.getCustomer(workspaceId, customerId);

    const updated = await prisma.customer.update({
      where: { id: existing.id },
      data,
    });

    wsManager.broadcastToWorkspace(workspaceId, "crm:customer_updated", {
      customerId: updated.id,
      companyName: updated.companyName,
      updatedAt: updated.updatedAt.toISOString(),
    });

    return updated;
  }

  // ── Contacts ──────────────────────────────────────────────────────────────
  public async createContact(workspaceId: string, data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    department?: string;
    customerId?: string;
    isPrimary?: boolean;
    notes?: string;
  }) {
    const contact = await prisma.contact.create({
      data: {
        workspaceId,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email?.trim(),
        phone: data.phone?.trim(),
        jobTitle: data.jobTitle?.trim(),
        department: data.department?.trim(),
        customerId: data.customerId,
        isPrimary: data.isPrimary ?? false,
        notes: data.notes?.trim(),
      },
      include: {
        customer: { select: { companyName: true } },
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "crm:contact_created", {
      contactId: contact.id,
      name: `${contact.firstName} ${contact.lastName}`,
      email: contact.email,
      customer: contact.customer?.companyName || null,
      createdAt: contact.createdAt.toISOString(),
    });

    return contact;
  }

  public async findContacts(workspaceId: string, filter: { query?: string; customerId?: string; limit?: number }) {
    const where: any = { workspaceId };
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.query && filter.query.trim()) {
      where.OR = [
        { firstName: { contains: filter.query.trim(), mode: "insensitive" } },
        { lastName: { contains: filter.query.trim(), mode: "insensitive" } },
        { email: { contains: filter.query.trim(), mode: "insensitive" } },
      ];
    }

    return prisma.contact.findMany({
      where,
      take: filter.limit || 20,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, companyName: true } },
      },
    });
  }

  public async getContact(workspaceId: string, contactIdOrName: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(contactIdOrName);
    const where: any = { workspaceId };

    if (isObjectId) {
      where.id = contactIdOrName;
    } else {
      const parts = contactIdOrName.trim().split(" ");
      where.OR = [
        { firstName: { contains: parts[0], mode: "insensitive" } },
        { lastName: { contains: parts[parts.length - 1], mode: "insensitive" } },
        { email: { contains: contactIdOrName.trim(), mode: "insensitive" } },
      ];
    }

    const contact = await prisma.contact.findFirst({
      where,
      include: { customer: true, deals: true },
    });

    if (!contact) {
      throw new NotFoundError(`Contact '${contactIdOrName}' not found in workspace`);
    }

    return contact;
  }

  public async updateContact(workspaceId: string, contactId: string, data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    jobTitle: string;
    department: string;
    isPrimary: boolean;
    notes: string;
  }>) {
    const existing = await this.getContact(workspaceId, contactId);

    const updated = await prisma.contact.update({
      where: { id: existing.id },
      data,
    });

    wsManager.broadcastToWorkspace(workspaceId, "crm:contact_updated", {
      contactId: updated.id,
      name: `${updated.firstName} ${updated.lastName}`,
      updatedAt: updated.updatedAt.toISOString(),
    });

    return updated;
  }

  // ── Deals & Pipeline ──────────────────────────────────────────────────────
  public async createDeal(workspaceId: string, data: {
    title: string;
    dealValue: number;
    stage?: DealStage;
    probability?: number;
    expectedClose?: Date;
    priority?: PriorityLevel;
    customerId?: string;
    contactId?: string;
    leadId?: string;
    assignedUserId?: string;
    notes?: string;
  }) {
    const deal = await prisma.deal.create({
      data: {
        workspaceId,
        title: data.title.trim(),
        dealValue: data.dealValue,
        stage: data.stage || "QUALIFICATION",
        probability: data.probability ?? 20,
        expectedClose: data.expectedClose,
        priority: data.priority || "MEDIUM",
        customerId: data.customerId,
        contactId: data.contactId,
        leadId: data.leadId,
        assignedUserId: data.assignedUserId,
        notes: data.notes?.trim(),
      },
      include: {
        customer: { select: { companyName: true } },
        contact: { select: { firstName: true, lastName: true } },
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "crm:deal_created", {
      dealId: deal.id,
      title: deal.title,
      dealValue: deal.dealValue,
      stage: deal.stage,
      customer: deal.customer?.companyName || null,
      createdAt: deal.createdAt.toISOString(),
    });

    return deal;
  }

  public async findDeals(workspaceId: string, filter: {
    query?: string;
    stage?: DealStage;
    priority?: PriorityLevel;
    assignedUserId?: string;
    customerId?: string;
    minAmount?: number;
    maxAmount?: number;
    limit?: number;
  }) {
    const where: any = { workspaceId };
    if (filter.stage) where.stage = filter.stage;
    if (filter.priority) where.priority = filter.priority;
    if (filter.assignedUserId) where.assignedUserId = filter.assignedUserId;
    if (filter.customerId) where.customerId = filter.customerId;

    if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
      where.dealValue = {};
      if (filter.minAmount !== undefined) where.dealValue.gte = filter.minAmount;
      if (filter.maxAmount !== undefined) where.dealValue.lte = filter.maxAmount;
    }

    if (filter.query && filter.query.trim()) {
      where.title = { contains: filter.query.trim(), mode: "insensitive" };
    }

    return prisma.deal.findMany({
      where,
      take: filter.limit || 20,
      orderBy: { expectedClose: "asc" },
      include: {
        customer: { select: { id: true, companyName: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  public async getDeal(workspaceId: string, dealIdOrTitle: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(dealIdOrTitle);
    const where: any = { workspaceId };

    if (isObjectId) {
      where.id = dealIdOrTitle;
    } else {
      where.title = { contains: dealIdOrTitle.trim(), mode: "insensitive" };
    }

    const deal = await prisma.deal.findFirst({
      where,
      include: {
        customer: true,
        contact: true,
        lead: true,
      },
    });

    if (!deal) {
      throw new NotFoundError(`Deal '${dealIdOrTitle}' not found in workspace`);
    }

    return deal;
  }

  public async moveDeal(workspaceId: string, dealId: string, targetStage: DealStage, reason?: string) {
    const deal = await this.getDeal(workspaceId, dealId);

    if (deal.stage === targetStage) {
      return deal;
    }

    const allowed = ALLOWED_DEAL_TRANSITIONS[deal.stage] || [];
    if (!allowed.includes(targetStage)) {
      throw new ValidationError(
        `Invalid pipeline transition: Cannot move deal directly from '${deal.stage}' to '${targetStage}'. Allowed transitions: [${allowed.join(
          ", "
        )}]`
      );
    }

    const closedAt = targetStage === "WON" || targetStage === "LOST" ? new Date() : null;

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: {
        stage: targetStage,
        closedAt,
        notes: reason ? `${deal.notes ? deal.notes + "\n" : ""}Stage changed to ${targetStage}: ${reason}` : deal.notes,
      },
      include: {
        customer: { select: { companyName: true } },
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "crm:deal_moved", {
      dealId: updated.id,
      title: updated.title,
      previousStage: deal.stage,
      newStage: targetStage,
      dealValue: updated.dealValue,
      closedAt: updated.closedAt?.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });

    return updated;
  }

  public async getPipelineSummary(workspaceId: string) {
    const deals = await prisma.deal.findMany({
      where: { workspaceId },
      select: {
        stage: true,
        dealValue: true,
        probability: true,
        expectedClose: true,
        updatedAt: true,
      },
    });

    const stageSummary: Record<DealStage, { count: number; totalValue: number; weightedValue: number }> = {
      QUALIFICATION: { count: 0, totalValue: 0, weightedValue: 0 },
      CONTACTED: { count: 0, totalValue: 0, weightedValue: 0 },
      PROPOSAL: { count: 0, totalValue: 0, weightedValue: 0 },
      NEGOTIATION: { count: 0, totalValue: 0, weightedValue: 0 },
      WON: { count: 0, totalValue: 0, weightedValue: 0 },
      LOST: { count: 0, totalValue: 0, weightedValue: 0 },
    };

    let totalActivePipelineValue = 0;
    let totalWeightedPipelineValue = 0;
    let totalWonValue = 0;
    let totalLostValue = 0;

    for (const d of deals) {
      const stage = d.stage as DealStage;
      if (stageSummary[stage]) {
        stageSummary[stage].count += 1;
        stageSummary[stage].totalValue += d.dealValue;
        const weighted = (d.dealValue * (d.probability || 0)) / 100;
        stageSummary[stage].weightedValue += weighted;

        if (stage === "WON") {
          totalWonValue += d.dealValue;
        } else if (stage === "LOST") {
          totalLostValue += d.dealValue;
        } else {
          totalActivePipelineValue += d.dealValue;
          totalWeightedPipelineValue += weighted;
        }
      }
    }

    return {
      totalDeals: deals.length,
      totalActivePipelineValue,
      totalWeightedPipelineValue,
      totalWonValue,
      totalLostValue,
      stageBreakdown: stageSummary,
    };
  }

  public async getStaleDeals(workspaceId: string, daysInactive = 14) {
    const cutoffDate = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000);

    const staleDeals = await prisma.deal.findMany({
      where: {
        workspaceId,
        stage: { in: ["QUALIFICATION", "CONTACTED", "PROPOSAL", "NEGOTIATION"] },
        updatedAt: { lt: cutoffDate },
      },
      orderBy: { updatedAt: "asc" },
      include: {
        customer: { select: { companyName: true } },
      },
    });

    return {
      count: staleDeals.length,
      daysThreshold: daysInactive,
      deals: staleDeals.map((d) => ({
        id: d.id,
        title: d.title,
        dealValue: d.dealValue,
        stage: d.stage,
        customer: d.customer?.companyName || null,
        lastActivityDate: d.updatedAt.toISOString(),
        daysInactive: Math.floor((Date.now() - d.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
      })),
    };
  }

  // ── CRM Activities ────────────────────────────────────────────────────────
  public async logActivity(workspaceId: string, data: {
    entityType: "lead" | "deal" | "customer" | "contact";
    entityId: string;
    type: "note" | "call" | "meeting" | "email" | "follow_up";
    title: string;
    content?: string;
    dueDate?: Date;
    userId?: string;
  }) {
    const activity = await prisma.cRMActivity.create({
      data: {
        workspaceId,
        entityType: data.entityType,
        entityId: data.entityId,
        type: data.type,
        title: data.title.trim(),
        content: data.content?.trim(),
        dueDate: data.dueDate,
        userId: data.userId,
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "crm:activity_created", {
      activityId: activity.id,
      entityType: activity.entityType,
      entityId: activity.entityId,
      type: activity.type,
      title: activity.title,
      createdAt: activity.createdAt.toISOString(),
    });

    return activity;
  }

  public async getOverdueFollowups(workspaceId: string) {
    const now = new Date();
    const activities = await prisma.cRMActivity.findMany({
      where: {
        workspaceId,
        isCompleted: false,
        dueDate: { lt: now },
      },
      orderBy: { dueDate: "asc" },
    });

    return {
      count: activities.length,
      overdueFollowups: activities.map((a) => ({
        id: a.id,
        entityType: a.entityType,
        entityId: a.entityId,
        type: a.type,
        title: a.title,
        dueDate: a.dueDate?.toISOString(),
        daysOverdue: Math.floor((now.getTime() - (a.dueDate?.getTime() || 0)) / (1000 * 60 * 60 * 24)),
      })),
    };
  }
}

export const crmService = new CRMService();
