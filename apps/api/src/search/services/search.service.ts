import { GlobalSearchResponse, SearchResultItem } from "@omnidesk/shared-types";
import { prisma } from "../../lib/prisma";

export class SearchService {
  /**
   * Search entities across a specific workspace.
   * Multi-entity search with strict workspace boundary isolation.
   */
  public async search(
    workspaceId: string,
    query: string,
    limit: number = 20,
    userId?: string
  ): Promise<GlobalSearchResponse> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return {
        query: "",
        totalResults: 0,
        resultsByGroup: {
          projects: [],
          tasks: [],
          crm: [],
          milestones: [],
          ai: [],
          finance: [],
          documents: [],
          knowledgeBases: [],
          communication: [],
        },
      };
    }

    const perEntityLimit = Math.min(Math.max(limit, 5), 25);

    // Parallel multi-entity queries strictly isolated by workspaceId
    const [
      projects,
      tasks,
      customers,
      contacts,
      leads,
      deals,
      milestones,
      aiExecutions,
      invoices,
      payments,
      expenses,
      documents,
      knowledgeBases,
    ] = await Promise.all([
      // 1. Projects
      prisma.project.findMany({
        where: {
          workspaceId,
          OR: [
            { name: { contains: trimmedQuery, mode: "insensitive" } },
            { description: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          health: true,
        },
        take: perEntityLimit,
      }),

      // 2. Tasks
      prisma.task.findMany({
        where: {
          workspaceId,
          OR: [
            { title: { contains: trimmedQuery, mode: "insensitive" } },
            { description: { contains: trimmedQuery, mode: "insensitive" } },
            { labels: { has: trimmedQuery } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          projectId: true,
        },
        take: perEntityLimit,
      }),

      // 3. Customers
      prisma.customer.findMany({
        where: {
          workspaceId,
          OR: [
            { companyName: { contains: trimmedQuery, mode: "insensitive" } },
            { contactPerson: { contains: trimmedQuery, mode: "insensitive" } },
            { email: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          companyName: true,
          contactPerson: true,
          email: true,
          industry: true,
        },
        take: perEntityLimit,
      }),

      // 4. Contacts
      prisma.contact.findMany({
        where: {
          workspaceId,
          OR: [
            { firstName: { contains: trimmedQuery, mode: "insensitive" } },
            { lastName: { contains: trimmedQuery, mode: "insensitive" } },
            { email: { contains: trimmedQuery, mode: "insensitive" } },
            { jobTitle: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          jobTitle: true,
          customer: { select: { companyName: true } },
        },
        take: perEntityLimit,
      }),

      // 5. Leads
      prisma.lead.findMany({
        where: {
          workspaceId,
          OR: [
            { title: { contains: trimmedQuery, mode: "insensitive" } },
            { notes: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          dealValue: true,
          stage: true,
          customer: { select: { companyName: true } },
        },
        take: perEntityLimit,
      }),

      // 6. Deals
      prisma.deal.findMany({
        where: {
          workspaceId,
          OR: [
            { title: { contains: trimmedQuery, mode: "insensitive" } },
            { notes: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          dealValue: true,
          stage: true,
          customer: { select: { companyName: true } },
        },
        take: perEntityLimit,
      }),

      // 7. Milestones
      prisma.milestone.findMany({
        where: {
          workspaceId,
          OR: [
            { title: { contains: trimmedQuery, mode: "insensitive" } },
            { description: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          project: { select: { id: true, name: true } },
        },
        take: perEntityLimit,
      }),

      // 8. AI Executions
      prisma.aIExecution.findMany({
        where: {
          workspaceId,
          OR: [
            { prompt: { contains: trimmedQuery, mode: "insensitive" } },
            { finalResponse: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          prompt: true,
          agentId: true,
          status: true,
          createdAt: true,
        },
        take: perEntityLimit,
      }),

      // 9. Invoices
      prisma.invoice.findMany({
        where: {
          workspaceId,
          isArchived: false,
          OR: [
            { invoiceNumber: { contains: trimmedQuery, mode: "insensitive" } },
            { notes: { contains: trimmedQuery, mode: "insensitive" } },
            { customer: { companyName: { contains: trimmedQuery, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          currency: true,
          status: true,
          dueDate: true,
          customer: { select: { companyName: true } },
        },
        take: perEntityLimit,
      }),

      // 10. Payments
      prisma.payment.findMany({
        where: {
          workspaceId,
          OR: [
            { reference: { contains: trimmedQuery, mode: "insensitive" } },
            { notes: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          reference: true,
          paymentMethod: true,
          invoice: { select: { invoiceNumber: true } },
        },
        take: perEntityLimit,
      }),

      // 11. Expenses
      prisma.expense.findMany({
        where: {
          workspaceId,
          isArchived: false,
          OR: [
            { vendor: { contains: trimmedQuery, mode: "insensitive" } },
            { description: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          vendor: true,
          description: true,
          amount: true,
          currency: true,
          approvalStatus: true,
          categoryName: true,
        },
        take: perEntityLimit,
      }),

      // 12. Documents
      prisma.document.findMany({
        where: {
          workspaceId,
          isArchived: false,
          OR: [
            { name: { contains: trimmedQuery, mode: "insensitive" } },
            { originalFileName: { contains: trimmedQuery, mode: "insensitive" } },
            { description: { contains: trimmedQuery, mode: "insensitive" } },
            { category: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          originalFileName: true,
          sizeBytes: true,
          category: true,
          status: true,
        },
        take: perEntityLimit,
      }),

      // 13. Knowledge Bases
      prisma.knowledgeBase.findMany({
        where: {
          workspaceId,
          isArchived: false,
          OR: [
            { name: { contains: trimmedQuery, mode: "insensitive" } },
            { description: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
        },
        take: perEntityLimit,
      }),
    ]);

    // Format Projects
    const projectResults: SearchResultItem[] = projects.map((p: any) => ({
      id: p.id,
      entityType: "project",
      title: p.name,
      subtitle: p.description ? p.description.slice(0, 80) : undefined,
      status: p.status,
      badge: p.health || "Project",
      navigationTarget: {
        tab: "projects",
        entityId: p.id,
      },
    }));

    // Format Tasks
    const taskResults: SearchResultItem[] = tasks.map((t: any) => ({
      id: t.id,
      entityType: "task",
      title: t.title,
      subtitle: t.description ? t.description.slice(0, 80) : `Priority: ${t.priority || "MEDIUM"}`,
      status: t.status,
      badge: t.priority || "Task",
      navigationTarget: {
        tab: "tasks",
        entityId: t.id,
      },
    }));

    // Format CRM Entities (Customers, Contacts, Leads, Deals)
    const crmResults: SearchResultItem[] = [
      ...customers.map((c: any) => ({
        id: c.id,
        entityType: "customer" as const,
        title: c.companyName,
        subtitle: c.contactPerson ? `Contact: ${c.contactPerson}` : c.email || undefined,
        badge: "Customer",
        navigationTarget: {
          tab: "crm" as const,
          entityId: c.id,
        },
      })),
      ...contacts.map((c: any) => ({
        id: c.id,
        entityType: "contact" as const,
        title: `${c.firstName} ${c.lastName}`,
        subtitle: c.jobTitle ? `${c.jobTitle} • ${c.customer?.companyName || ""}` : c.email || undefined,
        badge: "Contact",
        navigationTarget: {
          tab: "crm" as const,
          entityId: c.id,
        },
      })),
      ...leads.map((l: any) => ({
        id: l.id,
        entityType: "lead" as const,
        title: l.title,
        subtitle: `$${l.dealValue.toLocaleString()} • ${l.customer?.companyName || "Lead"}`,
        status: l.stage,
        badge: "Lead",
        navigationTarget: {
          tab: "crm" as const,
          entityId: l.id,
        },
      })),
      ...deals.map((d: any) => ({
        id: d.id,
        entityType: "deal" as const,
        title: d.title,
        subtitle: `$${d.dealValue.toLocaleString()} • ${d.customer?.companyName || "Deal"}`,
        status: d.stage,
        badge: "Deal",
        navigationTarget: {
          tab: "crm" as const,
          entityId: d.id,
        },
      })),
    ];

    // Format Milestones
    const milestoneResults: SearchResultItem[] = milestones.map((m: any) => ({
      id: m.id,
      entityType: "milestone",
      title: m.title,
      subtitle: m.project ? `Project: ${m.project.name}` : undefined,
      status: m.status,
      badge: "Milestone",
      navigationTarget: {
        tab: "projects",
        entityId: m.project?.id || m.id,
      },
    }));

    // Format AI Executions
    const aiResults: SearchResultItem[] = aiExecutions.map((a: any) => ({
      id: a.id,
      entityType: "ai_execution",
      title: a.prompt.length > 60 ? `${a.prompt.slice(0, 60)}...` : a.prompt,
      subtitle: `Agent: ${a.agentId} • ${new Date(a.createdAt).toLocaleDateString()}`,
      status: a.status,
      badge: "AI Session",
      navigationTarget: {
        tab: "ai",
        entityId: a.id,
      },
    }));

    // Format Finance Entities (Invoices, Payments, Expenses)
    const financeResults: SearchResultItem[] = [
      ...invoices.map((inv: any) => ({
        id: inv.id,
        entityType: "invoice" as const,
        title: inv.invoiceNumber,
        subtitle: `${inv.currency} ${inv.totalAmount.toLocaleString()} • ${inv.customer?.companyName || "Customer"}`,
        status: inv.status,
        badge: "Invoice",
        navigationTarget: {
          tab: "finance" as const,
          entityId: inv.id,
        },
      })),
      ...payments.map((p: any) => ({
        id: p.id,
        entityType: "payment" as const,
        title: `Payment: ${p.reference || p.id.slice(-6)}`,
        subtitle: `${p.currency} ${p.amount.toLocaleString()} • Inv: ${p.invoice?.invoiceNumber || ""}`,
        badge: "Payment",
        navigationTarget: {
          tab: "finance" as const,
          entityId: p.id,
        },
      })),
      ...expenses.map((e: any) => ({
        id: e.id,
        entityType: "expense" as const,
        title: `${e.vendor}: ${e.description.length > 40 ? e.description.slice(0, 40) + "..." : e.description}`,
        subtitle: `${e.currency} ${e.amount.toLocaleString()} • ${e.categoryName || "General"}`,
        status: e.approvalStatus,
        badge: "Expense",
        navigationTarget: {
          tab: "finance" as const,
          entityId: e.id,
        },
      })),
    ];

    // Format Documents
    const documentResults: SearchResultItem[] = documents.map((d: any) => ({
      id: d.id,
      entityType: "document" as const,
      title: d.name,
      subtitle: `${d.category || "General"} • ${(d.sizeBytes / 1024).toFixed(1)} KB`,
      status: d.status,
      badge: "Document",
      navigationTarget: {
        tab: "documents" as const,
        entityId: d.id,
      },
    }));

    // Format Knowledge Bases
    const kbResults: SearchResultItem[] = knowledgeBases.map((kb: any) => ({
      id: kb.id,
      entityType: "knowledge_base" as const,
      title: kb.name,
      subtitle: kb.description ? kb.description.slice(0, 80) : "Knowledge Base",
      status: kb.status,
      badge: "Knowledge Base",
      navigationTarget: {
        tab: "documents" as const,
        entityId: kb.id,
      },
    }));

    // Query Communication Messages (strictly scoped to user's conversation memberships)
    const communicationResults: SearchResultItem[] = [];
    if (userId) {
      const memberships = await prisma.conversationMember.findMany({
        where: { workspaceId, userId },
        select: { conversationId: true },
      });
      const convIds = memberships.map((m) => m.conversationId);
      if (convIds.length > 0) {
        const matchingMessages = await prisma.message.findMany({
          where: {
            workspaceId,
            conversationId: { in: convIds },
            isDeleted: false,
            content: { contains: trimmedQuery, mode: "insensitive" },
          },
          take: perEntityLimit,
          include: {
            sender: {
              select: { firstName: true, lastName: true },
            },
          },
        });

        for (const msg of matchingMessages) {
          const senderName = `${msg.sender?.firstName || "User"} ${msg.sender?.lastName || ""}`.trim();
          communicationResults.push({
            id: msg.id,
            entityType: "task" as const, // Map to valid search result item entityType
            title: msg.content.length > 60 ? `${msg.content.substring(0, 57)}...` : msg.content,
            subtitle: `Message from ${senderName}`,
            badge: "Chat",
            navigationTarget: {
              tab: "communication" as any,
              entityId: msg.conversationId,
            },
          });
        }
      }
    }

    // Apply limits per group
    const slicedProjects = projectResults.slice(0, limit);
    const slicedTasks = taskResults.slice(0, limit);
    const slicedCrm = crmResults.slice(0, limit);
    const slicedMilestones = milestoneResults.slice(0, limit);
    const slicedAi = aiResults.slice(0, limit);
    const slicedFinance = financeResults.slice(0, limit);
    const slicedDocuments = documentResults.slice(0, limit);
    const slicedKb = kbResults.slice(0, limit);
    const slicedCommunication = communicationResults.slice(0, limit);

    const totalResults =
      slicedProjects.length +
      slicedTasks.length +
      slicedCrm.length +
      slicedMilestones.length +
      slicedAi.length +
      slicedFinance.length +
      slicedDocuments.length +
      slicedKb.length +
      slicedCommunication.length;

    return {
      query: trimmedQuery,
      totalResults,
      resultsByGroup: {
        projects: slicedProjects,
        tasks: slicedTasks,
        crm: slicedCrm,
        milestones: slicedMilestones,
        ai: slicedAi,
        finance: slicedFinance,
        documents: slicedDocuments,
        knowledgeBases: slicedKb,
        communication: slicedCommunication,
      },
    };
  }
}

export const searchService = new SearchService();

