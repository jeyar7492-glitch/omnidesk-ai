import { prisma } from "../../lib/prisma";
import { GlobalSearchResponse, SearchResultItem } from "@omnidesk/shared-types";

export class SearchService {
  public async search(workspaceId: string, query: string, limit: number): Promise<GlobalSearchResponse> {
    const q = query.trim();
    const perType = Math.max(1, Math.ceil(limit / 5));
    const contains = { contains: q, mode: "insensitive" as const };
    const [projects, tasks, customers, contacts, leads, deals, milestones, executions] = await Promise.all([
      prisma.project.findMany({ where: { workspaceId, isArchived: false, OR: [{ name: contains }, { description: contains }] }, take: perType, orderBy: { updatedAt: "desc" } }),
      prisma.task.findMany({ where: { workspaceId, isArchived: false, OR: [{ title: contains }, { description: contains }, { labels: { has: q } }] }, take: perType, orderBy: { updatedAt: "desc" } }),
      prisma.customer.findMany({ where: { workspaceId, OR: [{ companyName: contains }, { contactPerson: contains }, { email: contains }] }, take: perType, orderBy: { updatedAt: "desc" } }),
      prisma.contact.findMany({ where: { workspaceId, OR: [{ firstName: contains }, { lastName: contains }, { email: contains }, { jobTitle: contains }] }, take: perType, orderBy: { updatedAt: "desc" } }),
      prisma.lead.findMany({ where: { workspaceId, OR: [{ title: contains }, { notes: contains }] }, take: perType, orderBy: { updatedAt: "desc" } }),
      prisma.deal.findMany({ where: { workspaceId, OR: [{ title: contains }, { notes: contains }] }, take: perType, orderBy: { updatedAt: "desc" } }),
      prisma.milestone.findMany({ where: { workspaceId, OR: [{ title: contains }, { description: contains }] }, take: perType, orderBy: { updatedAt: "desc" } }),
      prisma.aIExecution.findMany({ where: { workspaceId, OR: [{ prompt: contains }, { finalResponse: contains }] }, take: perType, orderBy: { createdAt: "desc" } }),
    ]);
    const result = (): Record<string, SearchResultItem[]> => ({ projects: [], tasks: [], crm: [], milestones: [], ai: [] });
    const results = result();
    for (const p of projects) results.projects.push({ id: p.id, category: "projects", title: p.name, subtitle: p.description || undefined, status: p.status, navigation: { tab: "projects", id: p.id } });
    for (const t of tasks) results.tasks.push({ id: t.id, category: "tasks", title: t.title, subtitle: t.description || undefined, status: t.status, navigation: { tab: "tasks", id: t.id } });
    for (const c of [...customers, ...contacts, ...leads, ...deals]) {
      const item: SearchResultItem = { id: c.id, category: "crm", title: "title" in c ? c.title : "companyName" in c ? c.companyName : `${c.firstName} ${c.lastName}`, navigation: { tab: "crm", id: c.id } };
      results.crm.push(item);
    }
    for (const m of milestones) results.milestones.push({ id: m.id, category: "milestones", title: m.title, subtitle: m.description || undefined, status: m.status, navigation: { tab: "projects", id: m.projectId } });
    for (const e of executions) results.ai.push({ id: e.id, category: "ai", title: e.prompt.slice(0, 120), subtitle: e.finalResponse?.slice(0, 160), status: e.status, navigation: { tab: "ai", id: e.id } });
    const flat = Object.values(results).flat().slice(0, limit);
    return { query: q, total: flat.length, results: { projects: results.projects, tasks: results.tasks, crm: results.crm, milestones: results.milestones, ai: results.ai } };
  }
}
export const searchService = new SearchService();
