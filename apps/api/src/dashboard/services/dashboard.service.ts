import { prisma } from "../../lib/prisma";

export class DashboardService {
  public async getDashboardMetrics(workspaceId: string) {
    const now = new Date();
    const [projects, tasks, deals, leads, executions, approvals, members, activities] = await Promise.all([
      prisma.project.findMany({ where: { workspaceId, isArchived: false }, orderBy: { updatedAt: "desc" }, take: 50 }),
      prisma.task.findMany({ where: { workspaceId, isArchived: false }, orderBy: { updatedAt: "desc" }, take: 1000 }),
      prisma.deal.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" }, take: 500, include: { customer: { select: { companyName: true } } } }),
      prisma.lead.count({ where: { workspaceId } }),
      prisma.aIExecution.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.aIApprovalRequest.findMany({ where: { workspaceId, status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.workspaceMember.findMany({ where: { workspaceId }, include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } }),
      prisma.auditEvent.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 30, include: { user: { select: { firstName: true, lastName: true } } } }),
    ]);

    const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
    const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;
    const overdueTasks = tasks.filter((t) => t.status !== "done" && !!t.dueDate && t.dueDate < now).length;
    const blockedTasks = tasks.filter((t) => t.status !== "done" && t.isBlocked).length;
    const openDeals = deals.filter((d) => !["WON", "LOST"].includes(d.stage)).length;
    const pipelineDeals = deals.filter((d) => !["WON", "LOST"].includes(d.stage));
    const pipelineValue = pipelineDeals.reduce((s, d) => s + d.dealValue, 0);
    const weightedForecast = pipelineDeals.reduce((s, d) => s + d.dealValue * (d.probability / 100), 0);
    const wonRevenue = deals.filter((d) => d.stage === "WON").reduce((s, d) => s + d.dealValue, 0);

    const taskStatus: Record<string, number> = {};
    const taskPriority: Record<string, number> = {};
    for (const task of tasks) {
      taskStatus[task.status] = (taskStatus[task.status] || 0) + 1;
      taskPriority[task.priority] = (taskPriority[task.priority] || 0) + 1;
    }

    const stages: Record<string, { count: number; value: number; weighted: number }> = {};
    for (const deal of deals) {
      const stage = String(deal.stage);
      stages[stage] ||= { count: 0, value: 0, weighted: 0 };
      stages[stage].count += 1;
      stages[stage].value += deal.dealValue;
      stages[stage].weighted += deal.dealValue * (deal.probability / 100);
    }

    const projectOverview = await Promise.all(projects.slice(0, 12).map(async (p) => {
      const projectTasks = tasks.filter((t) => t.projectId === p.id);
      const progress = projectTasks.length ? Math.round(projectTasks.filter((t) => t.status === "done").length / projectTasks.length * 100) : 0;
      const milestones = await prisma.milestone.findMany({ where: { workspaceId, projectId: p.id }, select: { dueDate: true, status: true } });
      return {
        id: p.id, name: p.name, status: p.status, health: p.health, progress,
        deadline: p.deadline?.toISOString(),
        overdueMilestones: milestones.filter((m) => m.status !== "completed" && !!m.dueDate && m.dueDate < now).length,
        upcomingMilestones: milestones.filter((m) => m.status !== "completed" && !!m.dueDate && m.dueDate >= now).length,
      };
    }));

    const teamWorkload = members.map((member) => {
      const mine = tasks.filter((t) => t.assigneeId === member.userId && t.status !== "done");
      const overdue = mine.filter((t) => !!t.dueDate && t.dueDate < now).length;
      const estimatedHours = mine.reduce((s, t) => s + (t.estimatedHours || 0), 0);
      return { userId: member.userId, name: `${member.user.firstName} ${member.user.lastName}`.trim(), role: member.role, activeTasks: mine.length, overdueTasks: overdue, estimatedHours, utilization: Math.min(100, Math.round(estimatedHours / 40 * 100)) };
    });

    const aiStats: Record<string, number> = {};
    const allExecutionCount = await prisma.aIExecution.count({ where: { workspaceId } });
    for (const execution of executions) aiStats[execution.status] = (aiStats[execution.status] || 0) + 1;

    return {
      kpis: { totalProjects: projects.length, activeProjects, completedProjects, totalTasks: tasks.length, overdueTasks, blockedTasks, pipelineValue, weightedForecast, openDeals, leads, aiExecutions: allExecutionCount, pendingApprovals: approvals.length },
      projectOverview,
      taskOverview: { status: taskStatus, priority: taskPriority },
      crmOverview: {
        stages,
        wonRevenue,
        staleDeals: deals.filter((d) => d.stage !== "WON" && d.stage !== "LOST" && d.updatedAt < new Date(now.getTime() - 14 * 86400000)).length,
        recentDeals: deals.slice(0, 8).map((d) => ({ id: d.id, title: d.title, stage: d.stage, dealValue: d.dealValue, probability: d.probability, expectedClose: d.expectedClose?.toISOString(), closedAt: d.closedAt?.toISOString(), priority: d.priority, customerName: d.customer?.companyName })),
      },
      aiActivity: {
        recent: executions.map((e) => ({ id: e.id, prompt: e.prompt, status: e.status, createdAt: e.createdAt.toISOString(), durationMs: e.durationMs || undefined })),
        stats: aiStats,
        pendingApprovals: approvals.map((a) => ({ id: a.id, actionName: a.actionName, riskLevel: a.riskLevel, createdAt: a.createdAt.toISOString() })),
      },
      teamWorkload,
      recentActivity: activities.map((a) => ({ id: a.id, action: a.action, entityType: a.entityType, entityId: a.entityId || undefined, userName: a.user ? `${a.user.firstName} ${a.user.lastName}`.trim() : undefined, createdAt: a.createdAt.toISOString(), details: a.details })),
      generatedAt: now.toISOString(),
    };
  }
}

export const dashboardService = new DashboardService();
