import { DashboardMetrics, SystemRole } from "@omnidesk/shared-types";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";

export class DashboardService {
  /**
   * Aggregate complete real-time dashboard metrics for a workspace.
   */
  public async getDashboardMetrics(workspaceId: string): Promise<DashboardMetrics> {
    const now = new Date();

    // 1. Projects aggregation
    const [allProjects, allMilestones] = await Promise.all([
      prisma.project.findMany({
        where: { workspaceId, isArchived: false },
        include: {
          tasks: { select: { id: true, status: true } },
          milestones: { select: { id: true, status: true, progress: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.milestone.findMany({
        where: { workspaceId },
        include: {
          project: { select: { name: true } },
        },
        orderBy: { dueDate: "asc" },
      }),
    ]);

    const totalProjects = allProjects.length;
    const activeProjectsList = allProjects.filter(
      (p) => p.status === "ACTIVE" || p.status === "PLANNING" || (p.status as string) === "IN_PROGRESS"
    );
    const completedProjectsCount = allProjects.filter(
      (p) => p.status === "COMPLETED" || (p.status as string) === "done"
    ).length;

    const formattedActiveProjects = activeProjectsList.slice(0, 6).map((p) => {
      let progressPercentage = 0;
      if (p.tasks.length > 0) {
        const doneTasks = p.tasks.filter((t) => t.status === "done").length;
        progressPercentage = Math.round((doneTasks / p.tasks.length) * 100);
      } else if (p.milestones.length > 0) {
        const totalProgress = p.milestones.reduce((acc, m) => acc + (m.progress || 0), 0);
        progressPercentage = Math.round(totalProgress / p.milestones.length);
      }

      return {
        id: p.id,
        name: p.name,
        status: p.status,
        health: p.health || "ON_TRACK",
        budget: p.budget,
        spent: p.spent,
        progressPercentage,
        deadline: p.deadline ? p.deadline.toISOString() : null,
      };
    });

    const upcomingMilestones = allMilestones
      .filter((m) => m.status !== "COMPLETED" && (!m.dueDate || m.dueDate >= now))
      .slice(0, 5)
      .map((m) => ({
        id: m.id,
        title: m.title,
        projectName: m.project?.name || "Independent",
        dueDate: m.dueDate ? m.dueDate.toISOString() : new Date().toISOString(),
        status: m.status,
      }));

    const overdueMilestonesCount = allMilestones.filter(
      (m) => m.status !== "COMPLETED" && m.dueDate && m.dueDate < now
    ).length;

    // 2. Tasks aggregation
    const allTasks = await prisma.task.findMany({
      where: { workspaceId, isArchived: false },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        isBlocked: true,
        estimatedHours: true,
        assigneeId: true,
      },
    });

    const totalTasks = allTasks.length;
    let overdueTasksCount = 0;
    let blockedTasksCount = 0;
    let completedTasksCount = 0;

    const taskStatusCounts = {
      todo: 0,
      in_progress: 0,
      review: 0,
      testing: 0,
      done: 0,
      backlog: 0,
    };

    const taskPriorityCounts = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0,
    };

    for (const task of allTasks) {
      const st = task.status.toLowerCase();
      if (st === "todo") taskStatusCounts.todo++;
      else if (st === "in_progress" || st === "inprogress") taskStatusCounts.in_progress++;
      else if (st === "review" || st === "in_review") taskStatusCounts.review++;
      else if (st === "testing") taskStatusCounts.testing++;
      else if (st === "done" || st === "completed") {
        taskStatusCounts.done++;
        completedTasksCount++;
      } else {
        taskStatusCounts.backlog++;
      }

      const pr = (task.priority || "MEDIUM").toUpperCase();
      if (pr === "LOW") taskPriorityCounts.LOW++;
      else if (pr === "HIGH") taskPriorityCounts.HIGH++;
      else if (pr === "URGENT") taskPriorityCounts.URGENT++;
      else taskPriorityCounts.MEDIUM++;

      if (task.status !== "done" && task.dueDate && task.dueDate < now) {
        overdueTasksCount++;
      }
      if (task.isBlocked) {
        blockedTasksCount++;
      }
    }

    // 3. CRM & Sales Pipeline aggregation
    const [deals, leads] = await Promise.all([
      prisma.deal.findMany({
        where: { workspaceId },
        include: {
          customer: { select: { companyName: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.lead.findMany({
        where: { workspaceId },
        select: { id: true, createdAt: true },
      }),
    ]);

    let pipelineValue = 0;
    let weightedForecast = 0;
    let wonRevenue = 0;
    let openDealsCount = 0;
    let staleDealsCount = 0;
    const staleThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const deal of deals) {
      if (deal.stage === "WON") {
        wonRevenue += deal.dealValue;
      } else if (deal.stage !== "LOST") {
        pipelineValue += deal.dealValue;
        weightedForecast += (deal.dealValue * (deal.probability || 0)) / 100;
        openDealsCount++;
        if (deal.updatedAt < staleThreshold) {
          staleDealsCount++;
        }
      }
    }

    const recentDeals = deals.slice(0, 5).map((d) => ({
      id: d.id,
      title: d.title,
      dealValue: d.dealValue,
      stage: d.stage,
      probability: d.probability,
      companyName: d.customer?.companyName || null,
    }));

    const newLeadsCount = leads.length;

    // 4. AI Executions & Approvals aggregation
    const [aiExecutions, pendingApprovals] = await Promise.all([
      prisma.aIExecution.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.aIApprovalRequest.findMany({
        where: { workspaceId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalAIExecutions = await prisma.aIExecution.count({
      where: { workspaceId },
    });
    const completedAIExecutions = await prisma.aIExecution.count({
      where: { workspaceId, status: "COMPLETED" },
    });
    const failedAIExecutions = await prisma.aIExecution.count({
      where: { workspaceId, status: "FAILED" },
    });
    const pendingAIExecutions = await prisma.aIExecution.count({
      where: { workspaceId, status: "RUNNING" },
    });

    const recentAIExecutionsFormatted = aiExecutions.slice(0, 5).map((e: any) => ({
      id: e.id,
      prompt: e.prompt,
      agentId: e.agentId,
      status: e.status,
      totalDurationMs: e.durationMs || undefined,
      createdAt: e.createdAt.toISOString(),
    }));

    const pendingApprovalsFormatted = pendingApprovals.slice(0, 5).map((a: any) => ({
      id: a.id,
      actionName: a.actionName,
      riskLevel: a.riskLevel,
      createdAt: a.createdAt.toISOString(),
    }));


    // 5. Team Workload aggregation
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const teamWorkload = members.map((m) => {
      const userTasks = allTasks.filter((t) => t.assigneeId === m.user.id);
      const userTotal = userTasks.length;
      const inProgress = userTasks.filter((t) => t.status === "in_progress").length;
      const overdue = userTasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < now).length;
      const completed = userTasks.filter((t) => t.status === "done").length;
      const estHours = userTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

      return {
        userId: m.user.id,
        name: `${m.user.firstName} ${m.user.lastName}`,
        email: m.user.email,
        role: m.role,
        totalTasks: userTotal,
        inProgressTasks: inProgress,
        overdueTasks: overdue,
        completedTasks: completed,
        estimatedHoursTotal: estHours,
      };
    });

    // 6. Unified Activity Feed
    const auditEvents = await prisma.auditEvent.findMany({
      where: { workspaceId },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    const recentActivity = auditEvents.map((a) => {
      let type: "project" | "task" | "deal" | "lead" | "ai" | "auth" | "approval" = "task";
      if (a.action.startsWith("ai:")) {
        type = a.action.includes("approval") ? "approval" : "ai";
      } else if (a.action.startsWith("crm:") || a.action.startsWith("deal:")) {
        type = "deal";
      } else if (a.action.startsWith("project:")) {
        type = "project";
      } else if (a.action.startsWith("auth:")) {
        type = "auth";
      }

      return {
        id: a.id,
        type,
        title: a.action.replace(":", " ").replace(/_/g, " ").toUpperCase(),
        description: `Entity: ${a.entityType} ${a.entityId || ""}`,
        timestamp: a.createdAt.toISOString(),
        user: a.user ? `${a.user.firstName} ${a.user.lastName}` : "System Operator",
      };
    });

    return {
      kpis: {
        totalProjects,
        activeProjects: activeProjectsList.length,
        completedProjects: completedProjectsCount,
        totalTasks,
        overdueTasks: overdueTasksCount,
        blockedTasks: blockedTasksCount,
        completedTasks: completedTasksCount,
        activePipelineValue: Math.round(pipelineValue * 100) / 100,
        weightedPipelineForecast: Math.round(weightedForecast * 100) / 100,
        openDeals: openDealsCount,
        newLeads: newLeadsCount,
        totalTeamMembers: members.length,
        aiExecutionsCount: totalAIExecutions,
        aiPendingApprovals: pendingApprovals.length,
      },
      projectsSummary: {
        activeProjects: formattedActiveProjects,
        upcomingMilestones,
        overdueMilestonesCount,
      },
      tasksSummary: {
        byStatus: taskStatusCounts,
        byPriority: taskPriorityCounts,
        overdueCount: overdueTasksCount,
        blockedCount: blockedTasksCount,
      },
      crmSummary: {
        pipelineValue: Math.round(pipelineValue * 100) / 100,
        weightedForecast: Math.round(weightedForecast * 100) / 100,
        openDealsCount,
        wonRevenue: Math.round(wonRevenue * 100) / 100,
        staleDealsCount,
        newLeadsCount,
        recentDeals,
      },
      aiSummary: {
        recentExecutions: recentAIExecutionsFormatted,
        pendingApprovals: pendingApprovalsFormatted,
        executionCounts: {
          total: totalAIExecutions,
          completed: completedAIExecutions,
          failed: failedAIExecutions,
          pending: pendingAIExecutions,
        },
      },
      teamWorkload,
      recentActivity,
    };
  }
}

export const dashboardService = new DashboardService();
