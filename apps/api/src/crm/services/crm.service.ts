import { DealStage, PriorityLevel, CRMDashboardMetrics } from "@omnidesk/shared-types";
import { prisma } from "../../lib/prisma";
import { wsManager } from "../../lib/websocket";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { NotificationService } from "../../notifications/services/notification.service";

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
  public async createLead(
    workspaceId: string,
    data: {
      title: string;
      source?: string;
      status?: string;
      customerId?: string;
      stage?: DealStage;
      dealValue?: number;
      probability?: number;
      expectedClose?: Date;
      priority?: PriorityLevel;
      assignedUserId?: string;
      notes?: string;
    },
    userId?: string
  ) {
    const lead = await prisma.lead.create({
      data: {
        workspaceId,
        title: data.title.trim(),
        source: data.source?.trim(),
        status: data.status?.trim() || "new",
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
        customer: { select: { id: true, companyName: true, email: true } },
      },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: "lead:created",
        entityType: "lead",
        entityId: lead.id,
        details: { title: lead.title, dealValue: lead.dealValue, stage: lead.stage },
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

    if (lead.assignedUserId && lead.assignedUserId !== userId) {
      NotificationService.getInstance()
        .createNotification({
          workspaceId,
          recipientId: lead.assignedUserId,
          type: "LEAD_ASSIGNED",
          title: `New lead assigned: ${lead.title}`,
          message: `You were assigned to lead "${lead.title}"`,
          priority: lead.priority === "URGENT" ? "URGENT" : "MEDIUM",
          entityType: "lead",
          entityId: lead.id,
          actionUrl: `/crm?tab=leads&selected=${lead.id}`,
          metadata: { leadId: lead.id, title: lead.title, dealValue: lead.dealValue },
        })
        .catch(() => {});
    }

    return lead;
  }

  public async findLeadsPaginated(
    workspaceId: string,
    filter: {
      query?: string;
      stage?: DealStage;
      status?: string;
      source?: string;
      priority?: PriorityLevel;
      assignedUserId?: string;
      isConverted?: boolean;
      isArchived?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ) {
    const where: any = { workspaceId };
    if (filter.stage) where.stage = filter.stage;
    if (filter.status) where.status = filter.status;
    if (filter.source) where.source = { contains: filter.source.trim(), mode: "insensitive" };
    if (filter.priority) where.priority = filter.priority;
    if (filter.assignedUserId) where.assignedUserId = filter.assignedUserId;
    if (filter.isConverted !== undefined) where.isConverted = filter.isConverted;
    if (filter.isArchived !== undefined) {
      where.isArchived = filter.isArchived;
    } else {
      where.isArchived = false;
    }

    if (filter.query && filter.query.trim()) {
      const q = filter.query.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { customer: { is: { companyName: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const page = Math.max(filter.page || 1, 1);
    const limit = Math.min(Math.max(filter.limit || 20, 1), 100);
    const skip = (page - 1) * limit;

    const sortField = filter.sortBy || "createdAt";
    const sortOrder = filter.sortOrder || "desc";
    const orderBy: any = { [sortField]: sortOrder };

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        take: limit,
        skip,
        orderBy,
        include: {
          customer: { select: { id: true, companyName: true, email: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async findLeads(
    workspaceId: string,
    filter: {
      query?: string;
      stage?: DealStage;
      status?: string;
      source?: string;
      priority?: PriorityLevel;
      assignedUserId?: string;
      isConverted?: boolean;
      isArchived?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ) {
    const res = await this.findLeadsPaginated(workspaceId, filter);
    return res.items;
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

    const activities = await prisma.cRMActivity.findMany({
      where: { workspaceId, entityType: "lead", entityId: lead.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return {
      ...lead,
      activities,
    };
  }

  public async updateLead(
    workspaceId: string,
    leadId: string,
    data: {
      title?: string;
      source?: string;
      status?: string;
      stage?: DealStage;
      dealValue?: number;
      probability?: number;
      expectedClose?: Date;
      priority?: PriorityLevel;
      assignedUserId?: string;
      notes?: string;
    },
    userId?: string
  ) {
    const existing = await this.getLead(workspaceId, leadId);

    const updated = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        title: data.title?.trim(),
        source: data.source?.trim(),
        status: data.status?.trim(),
        stage: data.stage,
        dealValue: data.dealValue,
        probability: data.probability,
        expectedClose: data.expectedClose,
        priority: data.priority,
        assignedUserId: data.assignedUserId,
        notes: data.notes?.trim(),
      },
      include: {
        customer: { select: { id: true, companyName: true } },
      },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: "lead:updated",
        entityType: "lead",
        entityId: updated.id,
        details: { changes: data },
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "crm:lead_updated", {
      leadId: updated.id,
      title: updated.title,
      stage: updated.stage,
      dealValue: updated.dealValue,
      updatedAt: updated.updatedAt.toISOString(),
    });

    if (
      data.assignedUserId &&
      data.assignedUserId !== existing.assignedUserId &&
      data.assignedUserId !== userId
    ) {
      NotificationService.getInstance()
        .createNotification({
          workspaceId,
          recipientId: data.assignedUserId,
          type: "LEAD_ASSIGNED",
          title: `Lead assigned to you: ${updated.title}`,
          message: `You were assigned to lead "${updated.title}"`,
          priority: updated.priority === "URGENT" ? "URGENT" : "MEDIUM",
          entityType: "lead",
          entityId: updated.id,
          actionUrl: `/crm?tab=leads&selected=${updated.id}`,
          metadata: { leadId: updated.id, title: updated.title },
        })
        .catch(() => {});
    }

    return updated;
  }

  public async convertLead(
    workspaceId: string,
    leadId: string,
    options: {
      createCustomer?: boolean;
      customerCompanyName?: string;
      createContact?: boolean;
      contactFirstName?: string;
      contactLastName?: string;
      contactEmail?: string;
      createDeal?: boolean;
      dealTitle?: string;
      dealValue?: number;
      dealStage?: DealStage;
      notes?: string;
    },
    userId?: string
  ) {
    const lead = await this.getLead(workspaceId, leadId);

    if (lead.isConverted) {
      throw new ValidationError(`Lead '${lead.title}' has already been converted`);
    }

    let customerId = (options as any).existingCustomerId || lead.customerId || undefined;
    let createdCustomer = null;

    // 1. Customer association/creation
    if (!customerId && options.createCustomer !== false) {
      const companyName =
        (options as any).customerName?.trim() ||
        options.customerCompanyName?.trim() ||
        lead.title;
      createdCustomer = await prisma.customer.create({
        data: {
          workspaceId,
          companyName,
          status: "active",
          assignedUserId: lead.assignedUserId,
          notes: options.notes || `Created from converted lead: ${lead.title}`,
        },
      });
      customerId = createdCustomer.id;
    }

    // 2. Contact creation
    let createdContact = null;
    if (options.createContact !== false) {
      const firstName = options.contactFirstName?.trim() || "Contact";
      const lastName = options.contactLastName?.trim() || lead.title;
      createdContact = await prisma.contact.create({
        data: {
          workspaceId,
          customerId,
          firstName,
          lastName,
          email: options.contactEmail?.trim() || lead.customer?.email || null,
          isPrimary: true,
          notes: `Created from converted lead: ${lead.title}`,
        },
      });
    }

    // 3. Deal creation
    let createdDeal = null;
    if (options.createDeal !== false) {
      const dealTitle = options.dealTitle?.trim() || lead.title;
      const dealValue = options.dealValue ?? lead.dealValue;
      const stage = options.dealStage || "QUALIFICATION";
      createdDeal = await prisma.deal.create({
        data: {
          workspaceId,
          customerId,
          contactId: createdContact?.id,
          leadId: lead.id,
          title: dealTitle,
          dealValue,
          stage,
          probability: lead.probability || 20,
          expectedClose: lead.expectedClose,
          priority: lead.priority,
          assignedUserId: lead.assignedUserId,
          notes: options.notes || lead.notes,
        },
      });
    }

    // 4. Update lead state
    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        isConverted: true,
        convertedAt: new Date(),
        status: "converted",
        stage: "WON",
        customerId,
        convertedCustomerId: customerId,
        convertedContactId: createdContact?.id,
        convertedDealId: createdDeal?.id,
      },
      include: {
        customer: true,
      },
    });

    // 5. Audit log
    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: "lead:converted",
        entityType: "lead",
        entityId: lead.id,
        details: {
          customerId,
          contactId: createdContact?.id,
          dealId: createdDeal?.id,
        },
      },
    });

    // 6. Broadcast event
    wsManager.broadcastToWorkspace(workspaceId, "crm:lead_converted", {
      leadId: lead.id,
      customerId,
      dealId: createdDeal?.id,
      contactId: createdContact?.id,
      convertedAt: updatedLead.convertedAt?.toISOString(),
    });

    return {
      lead: updatedLead,
      customer: createdCustomer,
      contact: createdContact,
      deal: createdDeal,
    };
  }

  public async archiveLead(workspaceId: string, leadId: string, archive = true, userId?: string) {
    const existing = await this.getLead(workspaceId, leadId);

    const updated = await prisma.lead.update({
      where: { id: existing.id },
      data: { isArchived: archive },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: archive ? "lead:archived" : "lead:restored",
        entityType: "lead",
        entityId: updated.id,
      },
    });

    return updated;
  }

  public async deleteLead(workspaceId: string, leadId: string, userId?: string) {
    const existing = await this.getLead(workspaceId, leadId);

    await prisma.lead.delete({
      where: { id: existing.id },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: "lead:deleted",
        entityType: "lead",
        entityId: existing.id,
        details: { title: existing.title },
      },
    });

    return { id: existing.id, deleted: true };
  }

  // ── Customers ─────────────────────────────────────────────────────────────
  public async createCustomer(
    workspaceId: string,
    data: {
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
      status?: string;
      notes?: string;
      assignedUserId?: string;
    },
    userId?: string
  ) {
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
        status: data.status?.trim() || "active",
        notes: data.notes?.trim(),
        assignedUserId: data.assignedUserId,
      },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: "customer:created",
        entityType: "customer",
        entityId: customer.id,
        details: { companyName: customer.companyName, industry: customer.industry },
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

  public async findCustomersPaginated(
    workspaceId: string,
    filter: {
      query?: string;
      industry?: string;
      status?: string;
      isArchived?: boolean;
      assignedUserId?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ) {
    const where: any = { workspaceId };
    if (filter.industry) where.industry = { contains: filter.industry.trim(), mode: "insensitive" };
    if (filter.status) where.status = filter.status;
    if (filter.assignedUserId) where.assignedUserId = filter.assignedUserId;
    if (filter.isArchived !== undefined) {
      where.isArchived = filter.isArchived;
    } else {
      where.isArchived = false;
    }

    if (filter.query && filter.query.trim()) {
      const q = filter.query.trim();
      where.OR = [
        { companyName: { contains: q, mode: "insensitive" } },
        { contactPerson: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const page = Math.max(filter.page || 1, 1);
    const limit = Math.min(Math.max(filter.limit || 20, 1), 100);
    const skip = (page - 1) * limit;

    const sortField = filter.sortBy || "createdAt";
    const sortOrder = filter.sortOrder || "desc";
    const orderBy: any = { [sortField]: sortOrder };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        take: limit,
        skip,
        orderBy,
        include: {
          contacts: true,
          _count: { select: { deals: true, leads: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async findCustomers(
    workspaceId: string,
    filter: {
      query?: string;
      industry?: string;
      status?: string;
      isArchived?: boolean;
      assignedUserId?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ) {
    const res = await this.findCustomersPaginated(workspaceId, filter);
    return res.items;
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

    const activities = await prisma.cRMActivity.findMany({
      where: { workspaceId, entityType: "customer", entityId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return {
      ...customer,
      activities,
    };
  }

  public async updateCustomer(
    workspaceId: string,
    customerId: string,
    data: Partial<{
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
      notes: string;
    }>,
    userId?: string
  ) {
    const existing = await this.getCustomer(workspaceId, customerId);

    const updated = await prisma.customer.update({
      where: { id: existing.id },
      data,
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: "customer:updated",
        entityType: "customer",
        entityId: updated.id,
        details: { changes: data },
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "crm:customer_updated", {
      customerId: updated.id,
      companyName: updated.companyName,
      updatedAt: updated.updatedAt.toISOString(),
    });

    return updated;
  }

  public async archiveCustomer(workspaceId: string, customerId: string, archive = true, userId?: string) {
    const existing = await this.getCustomer(workspaceId, customerId);

    const updated = await prisma.customer.update({
      where: { id: existing.id },
      data: {
        isArchived: archive,
        status: archive ? "archived" : "active",
      },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: archive ? "customer:archived" : "customer:restored",
        entityType: "customer",
        entityId: updated.id,
      },
    });

    return updated;
  }

  public async deleteCustomer(workspaceId: string, customerId: string, userId?: string) {
    const existing = await this.getCustomer(workspaceId, customerId);

    // Unlink contacts, deals, leads gracefully before deletion
    await prisma.contact.updateMany({
      where: { customerId: existing.id },
      data: { customerId: null },
    });
    await prisma.deal.updateMany({
      where: { customerId: existing.id },
      data: { customerId: null },
    });
    await prisma.lead.updateMany({
      where: { customerId: existing.id },
      data: { customerId: null },
    });

    await prisma.customer.delete({
      where: { id: existing.id },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: "customer:deleted",
        entityType: "customer",
        entityId: existing.id,
        details: { companyName: existing.companyName },
      },
    });

    return { id: existing.id, deleted: true };
  }

  // ── Contacts ──────────────────────────────────────────────────────────────
  public async createContact(
    workspaceId: string,
    data: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      jobTitle?: string;
      department?: string;
      customerId?: string;
      isPrimary?: boolean;
      notes?: string;
    },
    userId?: string
  ) {
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
        customer: { select: { id: true, companyName: true } },
      },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: "contact:created",
        entityType: "contact",
        entityId: contact.id,
        details: { name: `${contact.firstName} ${contact.lastName}`, email: contact.email },
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

  public async findContactsPaginated(
    workspaceId: string,
    filter: {
      query?: string;
      customerId?: string;
      isPrimary?: boolean;
      isArchived?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ) {
    const where: any = { workspaceId };
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.isPrimary !== undefined) where.isPrimary = filter.isPrimary;
    if (filter.isArchived !== undefined) {
      where.isArchived = filter.isArchived;
    } else {
      where.isArchived = false;
    }

    if (filter.query && filter.query.trim()) {
      const q = filter.query.trim();
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { jobTitle: { contains: q, mode: "insensitive" } },
      ];
    }

    const page = Math.max(filter.page || 1, 1);
    const limit = Math.min(Math.max(filter.limit || 20, 1), 100);
    const skip = (page - 1) * limit;

    const sortField = filter.sortBy || "createdAt";
    const sortOrder = filter.sortOrder || "desc";
    const orderBy: any = { [sortField]: sortOrder };

    const [items, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        take: limit,
        skip,
        orderBy,
        include: {
          customer: { select: { id: true, companyName: true } },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async findContacts(
    workspaceId: string,
    filter: {
      query?: string;
      customerId?: string;
      isPrimary?: boolean;
      isArchived?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ) {
    const res = await this.findContactsPaginated(workspaceId, filter);
    return res.items;
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

    const activities = await prisma.cRMActivity.findMany({
      where: { workspaceId, entityType: "contact", entityId: contact.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return {
      ...contact,
      activities,
    };
  }

  public async updateContact(
    workspaceId: string,
    contactId: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      jobTitle: string;
      department: string;
      customerId: string;
      isPrimary: boolean;
      notes: string;
    }>,
    userId?: string
  ) {
    const existing = await this.getContact(workspaceId, contactId);

    const updated = await prisma.contact.update({
      where: { id: existing.id },
      data,
      include: {
        customer: { select: { id: true, companyName: true } },
      },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: "contact:updated",
        entityType: "contact",
        entityId: updated.id,
        details: { changes: data },
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "crm:contact_updated", {
      contactId: updated.id,
      name: `${updated.firstName} ${updated.lastName}`,
      updatedAt: updated.updatedAt.toISOString(),
    });

    return updated;
  }

  public async archiveContact(workspaceId: string, contactId: string, archive = true, userId?: string) {
    const existing = await this.getContact(workspaceId, contactId);

    const updated = await prisma.contact.update({
      where: { id: existing.id },
      data: { isArchived: archive },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: archive ? "contact:archived" : "contact:restored",
        entityType: "contact",
        entityId: updated.id,
      },
    });

    return updated;
  }

  public async deleteContact(workspaceId: string, contactId: string, userId?: string) {
    const existing = await this.getContact(workspaceId, contactId);

    await prisma.deal.updateMany({
      where: { contactId: existing.id },
      data: { contactId: null },
    });

    await prisma.contact.delete({
      where: { id: existing.id },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: "contact:deleted",
        entityType: "contact",
        entityId: existing.id,
        details: { name: `${existing.firstName} ${existing.lastName}` },
      },
    });

    return { id: existing.id, deleted: true };
  }

  // ── Deals & Pipeline ──────────────────────────────────────────────────────
  public async createDeal(
    workspaceId: string,
    data: {
      title: string;
      currency?: string;
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
    },
    userId?: string
  ) {
    const deal = await prisma.deal.create({
      data: {
        workspaceId,
        title: data.title.trim(),
        currency: data.currency || "USD",
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
        customer: { select: { id: true, companyName: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: "deal:created",
        entityType: "deal",
        entityId: deal.id,
        details: { title: deal.title, dealValue: deal.dealValue, stage: deal.stage },
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

  public async findDealsPaginated(
    workspaceId: string,
    filter: {
      query?: string;
      stage?: DealStage;
      priority?: PriorityLevel;
      assignedUserId?: string;
      customerId?: string;
      contactId?: string;
      minAmount?: number;
      maxAmount?: number;
      isArchived?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ) {
    const where: any = { workspaceId };
    if (filter.stage) where.stage = filter.stage;
    if (filter.priority) where.priority = filter.priority;
    if (filter.assignedUserId) where.assignedUserId = filter.assignedUserId;
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.contactId) where.contactId = filter.contactId;
    if (filter.isArchived !== undefined) {
      where.isArchived = filter.isArchived;
    } else {
      where.isArchived = false;
    }

    if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
      where.dealValue = {};
      if (filter.minAmount !== undefined) where.dealValue.gte = filter.minAmount;
      if (filter.maxAmount !== undefined) where.dealValue.lte = filter.maxAmount;
    }

    if (filter.query && filter.query.trim()) {
      where.title = { contains: filter.query.trim(), mode: "insensitive" };
    }

    const page = Math.max(filter.page || 1, 1);
    const limit = Math.min(Math.max(filter.limit || 20, 1), 100);
    const skip = (page - 1) * limit;

    const sortField = filter.sortBy || "expectedClose";
    const sortOrder = filter.sortOrder || "asc";
    const orderBy: any = { [sortField]: sortOrder };

    const [items, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        take: limit,
        skip,
        orderBy,
        include: {
          customer: { select: { id: true, companyName: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.deal.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async findDeals(
    workspaceId: string,
    filter: {
      query?: string;
      stage?: DealStage;
      priority?: PriorityLevel;
      assignedUserId?: string;
      customerId?: string;
      contactId?: string;
      minAmount?: number;
      maxAmount?: number;
      isArchived?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ) {
    const res = await this.findDealsPaginated(workspaceId, filter);
    return res.items;
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

    const activities = await prisma.cRMActivity.findMany({
      where: { workspaceId, entityType: "deal", entityId: deal.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return {
      ...deal,
      activities,
    };
  }

  public async updateDeal(
    workspaceId: string,
    dealId: string,
    data: Partial<{
      title: string;
      currency: string;
      dealValue: number;
      stage: DealStage;
      probability: number;
      expectedClose: Date;
      priority: PriorityLevel;
      customerId: string;
      contactId: string;
      assignedUserId: string;
      notes: string;
    }>,
    userId?: string
  ) {
    const existing = await this.getDeal(workspaceId, dealId);

    const updated = await prisma.deal.update({
      where: { id: existing.id },
      data,
      include: {
        customer: { select: { id: true, companyName: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: "deal:updated",
        entityType: "deal",
        entityId: updated.id,
        details: { changes: data },
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "crm:deal_updated", {
      dealId: updated.id,
      title: updated.title,
      stage: updated.stage,
      dealValue: updated.dealValue,
      updatedAt: updated.updatedAt.toISOString(),
    });

    return updated;
  }

  public async moveDeal(workspaceId: string, dealId: string, targetStage: DealStage, reason?: string, userId?: string) {
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
        customer: { select: { id: true, companyName: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: "deal:stage_changed",
        entityType: "deal",
        entityId: updated.id,
        details: { previousStage: deal.stage, targetStage, reason },
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

    wsManager.broadcastToWorkspace(workspaceId, "crm:deal_stage_changed", {
      dealId: updated.id,
      stage: targetStage,
    });

    if (deal.assignedUserId && deal.assignedUserId !== userId) {
      const isWon = targetStage === "WON";
      const isLost = targetStage === "LOST";
      const notifType = isWon ? "DEAL_WON" : isLost ? "DEAL_LOST" : "DEAL_STAGE_CHANGED";
      const notifTitle = isWon
        ? `Deal won: ${updated.title}!`
        : isLost
        ? `Deal lost: ${updated.title}`
        : `Deal stage changed: ${updated.title}`;
      const notifMessage = isWon
        ? `Congratulations! Deal "${updated.title}" was marked as WON ($${updated.dealValue.toLocaleString()}).`
        : isLost
        ? `Deal "${updated.title}" was marked as LOST.${reason ? " Reason: " + reason : ""}`
        : `Deal "${updated.title}" moved to stage ${targetStage}.`;

      NotificationService.getInstance()
        .createNotification({
          workspaceId,
          recipientId: deal.assignedUserId,
          type: notifType,
          title: notifTitle,
          message: notifMessage,
          priority: isWon ? "HIGH" : "MEDIUM",
          entityType: "deal",
          entityId: updated.id,
          actionUrl: `/crm?tab=deals&selected=${updated.id}`,
          metadata: { dealId: updated.id, title: updated.title, stage: targetStage, dealValue: updated.dealValue },
        })
        .catch(() => {});
    }

    return updated;
  }

  public async archiveDeal(workspaceId: string, dealId: string, archive = true, userId?: string) {
    const existing = await this.getDeal(workspaceId, dealId);

    const updated = await prisma.deal.update({
      where: { id: existing.id },
      data: { isArchived: archive },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: archive ? "deal:archived" : "deal:restored",
        entityType: "deal",
        entityId: updated.id,
      },
    });

    return updated;
  }

  public async deleteDeal(workspaceId: string, dealId: string, userId?: string) {
    const existing = await this.getDeal(workspaceId, dealId);

    await prisma.deal.delete({
      where: { id: existing.id },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: "deal:deleted",
        entityType: "deal",
        entityId: existing.id,
        details: { title: existing.title },
      },
    });

    return { id: existing.id, deleted: true };
  }

  // ── Pipeline Summary & Analytics ──────────────────────────────────────────
  public async getPipelineSummary(workspaceId: string) {
    const deals = await prisma.deal.findMany({
      where: { workspaceId, isArchived: false },
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
      totalActivePipelineValue: Math.round(totalActivePipelineValue * 100) / 100,
      totalWeightedPipelineValue: Math.round(totalWeightedPipelineValue * 100) / 100,
      totalWonValue: Math.round(totalWonValue * 100) / 100,
      totalLostValue: Math.round(totalLostValue * 100) / 100,
      stageBreakdown: stageSummary,
    };
  }

  public async getStaleDeals(workspaceId: string, daysInactive = 14) {
    const cutoffDate = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000);

    const staleDeals = await prisma.deal.findMany({
      where: {
        workspaceId,
        isArchived: false,
        stage: { in: ["QUALIFICATION", "CONTACTED", "PROPOSAL", "NEGOTIATION"] },
        updatedAt: { lt: cutoffDate },
      },
      orderBy: { updatedAt: "asc" },
      include: {
        customer: { select: { id: true, companyName: true } },
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
  public async logActivity(
    workspaceId: string,
    data: {
      entityType: "lead" | "deal" | "customer" | "contact";
      entityId: string;
      type: "note" | "call" | "meeting" | "email" | "follow_up" | string;
      title: string;
      content?: string;
      dueDate?: Date;
      userId?: string;
    }
  ) {
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

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: data.userId,
        action: "crm_activity:created",
        entityType: "crm_activity",
        entityId: activity.id,
        details: { entityType: activity.entityType, entityId: activity.entityId, title: activity.title },
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

  public async findActivitiesPaginated(
    workspaceId: string,
    filter: {
      entityType?: "lead" | "deal" | "customer" | "contact";
      entityId?: string;
      type?: string;
      isCompleted?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ) {
    const where: any = { workspaceId };
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.type) where.type = filter.type;
    if (filter.isCompleted !== undefined) where.isCompleted = filter.isCompleted;

    const page = Math.max(filter.page || 1, 1);
    const limit = Math.min(Math.max(filter.limit || 20, 1), 100);
    const skip = (page - 1) * limit;

    const sortField = filter.sortBy || "createdAt";
    const sortOrder = filter.sortOrder || "desc";
    const orderBy: any = { [sortField]: sortOrder };

    const [items, total] = await Promise.all([
      prisma.cRMActivity.findMany({
        where,
        take: limit,
        skip,
        orderBy,
      }),
      prisma.cRMActivity.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async findActivities(
    workspaceId: string,
    filter: {
      entityType?: "lead" | "deal" | "customer" | "contact";
      entityId?: string;
      type?: string;
      isCompleted?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ) {
    const res = await this.findActivitiesPaginated(workspaceId, filter);
    return res.items;
  }

  public async updateActivity(
    workspaceId: string,
    activityId: string,
    data: {
      title?: string;
      content?: string;
      type?: string;
      dueDate?: Date | null;
      isCompleted?: boolean;
    },
    userId?: string
  ) {
    const existing = await prisma.cRMActivity.findFirst({
      where: { id: activityId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundError(`Activity '${activityId}' not found in workspace`);
    }

    const completedAt =
      data.isCompleted !== undefined
        ? data.isCompleted
          ? new Date()
          : null
        : existing.completedAt;

    const updated = await prisma.cRMActivity.update({
      where: { id: existing.id },
      data: {
        title: data.title?.trim(),
        content: data.content?.trim(),
        type: data.type,
        dueDate: data.dueDate,
        isCompleted: data.isCompleted,
        completedAt,
      },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: "crm_activity:updated",
        entityType: "crm_activity",
        entityId: updated.id,
      },
    });

    return updated;
  }

  public async deleteActivity(workspaceId: string, activityId: string, userId?: string) {
    const existing = await prisma.cRMActivity.findFirst({
      where: { id: activityId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundError(`Activity '${activityId}' not found in workspace`);
    }

    await prisma.cRMActivity.delete({
      where: { id: existing.id },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: "crm_activity:deleted",
        entityType: "crm_activity",
        entityId: existing.id,
      },
    });

    return { id: existing.id, deleted: true };
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

  // ── CRM Dashboard Analytics ───────────────────────────────────────────────
  public async getCRMDashboard(workspaceId: string): Promise<CRMDashboardMetrics> {
    const [
      totalCustomers,
      activeCustomers,
      totalContacts,
      leads,
      deals,
      recentActivitiesRaw,
    ] = await Promise.all([
      prisma.customer.count({ where: { workspaceId } }),
      prisma.customer.count({ where: { workspaceId, status: "active", isArchived: false } }),
      prisma.contact.count({ where: { workspaceId, isArchived: false } }),
      prisma.lead.findMany({
        where: { workspaceId, isArchived: false },
        select: { stage: true, priority: true, isConverted: true },
      }),
      prisma.deal.findMany({
        where: { workspaceId, isArchived: false },
        select: { stage: true, dealValue: true, probability: true },
      }),
      prisma.cRMActivity.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    // Lead metrics
    let openLeads = 0;
    let convertedLeads = 0;
    const leadStageDistribution: Record<string, number> = {};
    const leadPriorityDistribution: Record<string, number> = {};

    for (const l of leads) {
      if (l.isConverted) {
        convertedLeads++;
      } else {
        openLeads++;
      }
      leadStageDistribution[l.stage] = (leadStageDistribution[l.stage] || 0) + 1;
      leadPriorityDistribution[l.priority] = (leadPriorityDistribution[l.priority] || 0) + 1;
    }

    // Deal and pipeline metrics
    const stageSummary: Record<DealStage, { count: number; totalValue: number; weightedValue: number }> = {
      QUALIFICATION: { count: 0, totalValue: 0, weightedValue: 0 },
      CONTACTED: { count: 0, totalValue: 0, weightedValue: 0 },
      PROPOSAL: { count: 0, totalValue: 0, weightedValue: 0 },
      NEGOTIATION: { count: 0, totalValue: 0, weightedValue: 0 },
      WON: { count: 0, totalValue: 0, weightedValue: 0 },
      LOST: { count: 0, totalValue: 0, weightedValue: 0 },
    };

    let openDeals = 0;
    let wonDeals = 0;
    let lostDeals = 0;
    let totalPipelineValue = 0;
    let totalWeightedPipelineValue = 0;
    let wonRevenue = 0;

    for (const d of deals) {
      const stage = d.stage as DealStage;
      if (stageSummary[stage]) {
        stageSummary[stage].count += 1;
        stageSummary[stage].totalValue += d.dealValue;
        const weighted = (d.dealValue * (d.probability || 0)) / 100;
        stageSummary[stage].weightedValue += weighted;

        if (stage === "WON") {
          wonDeals++;
          wonRevenue += d.dealValue;
        } else if (stage === "LOST") {
          lostDeals++;
        } else {
          openDeals++;
          totalPipelineValue += d.dealValue;
          totalWeightedPipelineValue += weighted;
        }
      }
    }

    const conversionRate =
      leads.length > 0
        ? Math.round((convertedLeads / leads.length) * 1000) / 10
        : deals.length > 0
        ? Math.round((wonDeals / deals.length) * 1000) / 10
        : 0;

    const recentActivities = recentActivitiesRaw.map((a) => ({
      id: a.id,
      entityType: a.entityType as any,
      entityId: a.entityId,
      type: a.type,
      title: a.title,
      content: a.content,
      dueDate: a.dueDate ? a.dueDate.toISOString() : null,
      isCompleted: a.isCompleted,
      completedAt: a.completedAt ? a.completedAt.toISOString() : null,
      userId: a.userId,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));

    return {
      totalCustomers,
      activeCustomers,
      totalContacts,
      openLeads,
      convertedLeads,
      openDeals,
      wonDeals,
      lostDeals,
      totalPipelineValue: Math.round(totalPipelineValue * 100) / 100,
      weightedPipelineValue: Math.round(totalWeightedPipelineValue * 100) / 100,
      wonRevenue: Math.round(wonRevenue * 100) / 100,
      conversionRate,
      pipelineByStage: stageSummary,
      leadDistribution: {
        byStage: leadStageDistribution,
        byPriority: leadPriorityDistribution,
      },
      recentActivities,
    };
  }
}

export const crmService = new CRMService();
