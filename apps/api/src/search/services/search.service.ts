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
    limit: number = 20
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


    // Apply limits per group
    const slicedProjects = projectResults.slice(0, limit);
    const slicedTasks = taskResults.slice(0, limit);
    const slicedCrm = crmResults.slice(0, limit);
    const slicedMilestones = milestoneResults.slice(0, limit);
    const slicedAi = aiResults.slice(0, limit);

    const totalResults =
      slicedProjects.length +
      slicedTasks.length +
      slicedCrm.length +
      slicedMilestones.length +
      slicedAi.length;

    return {
      query: trimmedQuery,
      totalResults,
      resultsByGroup: {
        projects: slicedProjects,
        tasks: slicedTasks,
        crm: slicedCrm,
        milestones: slicedMilestones,
        ai: slicedAi,
      },
    };
  }
}

export const searchService = new SearchService();
