import { ToolDefinition } from "@omnidesk/shared-types";
import { IAITool } from "./tool.interface";
import { SystemPingTool } from "./built-in/system_ping.tool";
import { WorkspaceInfoTool } from "./built-in/workspace_info.tool";
import { SystemMaintenanceTool } from "./built-in/system_maintenance.tool";

// Task AI Tools
import { TaskFindTool } from "./task/task_find.tool";
import { TaskGetTool } from "./task/task_get.tool";
import { TaskCreateTool } from "./task/task_create.tool";
import { TaskUpdateTool } from "./task/task_update.tool";
import { TaskMoveTool } from "./task/task_move.tool";
import { TaskAssignTool } from "./task/task_assign.tool";
import { TaskCommentTool } from "./task/task_comment.tool";
import { TaskListOverdueTool } from "./task/task_list_overdue.tool";
import { TaskChecklistCreateTool } from "./task/task_checklist_create.tool";
import { TaskChecklistUpdateTool } from "./task/task_checklist_update.tool";
import { TaskDependencyCreateTool } from "./task/task_dependency_create.tool";
import { TaskDependencyRemoveTool } from "./task/task_dependency_remove.tool";
import { TaskBlockersTool } from "./task/task_blockers.tool";

// Milestone AI Tools
import { MilestoneCreateTool } from "./task/milestone_create.tool";
import { MilestoneFindTool } from "./task/milestone_find.tool";
import { MilestoneGetTool } from "./task/milestone_get.tool";
import { MilestoneUpdateTool } from "./task/milestone_update.tool";
import { MilestoneCompleteTool } from "./task/milestone_complete.tool";
import { MilestoneOverdueTool } from "./task/milestone_overdue.tool";

// Project AI Tools
import { ProjectCreateTool } from "./projects/project_create.tool";
import { ProjectFindTool } from "./projects/project_find.tool";
import { ProjectGetTool } from "./projects/project_get.tool";
import { ProjectUpdateTool } from "./projects/project_update.tool";
import { ProjectAssignTool } from "./projects/project_assign.tool";
import { ProjectArchiveTool } from "./projects/project_archive.tool";
import { ProjectHealthTool } from "./projects/project_health.tool";
import { ProjectProgressTool } from "./projects/project_progress.tool";
import { TeamWorkloadTool } from "./projects/team_workload.tool";

// CRM AI Tools
import { LeadCreateTool } from "./crm/lead_create.tool";
import { LeadFindTool } from "./crm/lead_find.tool";
import { LeadGetTool } from "./crm/lead_get.tool";
import { LeadUpdateTool } from "./crm/lead_update.tool";
import { LeadAssignTool } from "./crm/lead_assign.tool";
import { LeadStatusTool } from "./crm/lead_status.tool";

import { CustomerCreateTool } from "./crm/customer_create.tool";
import { CustomerFindTool } from "./crm/customer_find.tool";
import { CustomerGetTool } from "./crm/customer_get.tool";
import { CustomerUpdateTool } from "./crm/customer_update.tool";

import { ContactCreateTool } from "./crm/contact_create.tool";
import { ContactFindTool } from "./crm/contact_find.tool";
import { ContactGetTool } from "./crm/contact_get.tool";
import { ContactUpdateTool } from "./crm/contact_update.tool";

import { DealCreateTool } from "./crm/deal_create.tool";
import { DealFindTool } from "./crm/deal_find.tool";
import { DealGetTool } from "./crm/deal_get.tool";
import { DealUpdateTool } from "./crm/deal_update.tool";
import { DealAssignTool } from "./crm/deal_assign.tool";
import { DealMoveTool } from "./crm/deal_move.tool";
import { DealCloseTool } from "./crm/deal_close.tool";

import { PipelineSummaryTool } from "./crm/pipeline_summary.tool";
import { StaleDealsTool } from "./crm/stale_deals.tool";
import { OverdueFollowupsTool } from "./crm/overdue_followups.tool";
import { CRMActivityTool } from "./crm/crm_activity.tool";

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, IAITool> = new Map();

  private constructor() {
    this.registerBuiltInTools();
  }

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  private registerBuiltInTools(): void {
    // Diagnostic / System Tools
    this.registerTool(new SystemPingTool());
    this.registerTool(new WorkspaceInfoTool());
    this.registerTool(new SystemMaintenanceTool());

    // Task Management Production Tools
    this.registerTool(new TaskFindTool());
    this.registerTool(new TaskGetTool());
    this.registerTool(new TaskCreateTool());
    this.registerTool(new TaskUpdateTool());
    this.registerTool(new TaskMoveTool());
    this.registerTool(new TaskAssignTool());
    this.registerTool(new TaskCommentTool());
    this.registerTool(new TaskListOverdueTool());
    this.registerTool(new TaskChecklistCreateTool());
    this.registerTool(new TaskChecklistUpdateTool());
    this.registerTool(new TaskDependencyCreateTool());
    this.registerTool(new TaskDependencyRemoveTool());
    this.registerTool(new TaskBlockersTool());

    // Milestone Tools
    this.registerTool(new MilestoneCreateTool());
    this.registerTool(new MilestoneFindTool());
    this.registerTool(new MilestoneGetTool());
    this.registerTool(new MilestoneUpdateTool());
    this.registerTool(new MilestoneCompleteTool());
    this.registerTool(new MilestoneOverdueTool());

    // Project Management Tools
    this.registerTool(new ProjectCreateTool());
    this.registerTool(new ProjectFindTool());
    this.registerTool(new ProjectGetTool());
    this.registerTool(new ProjectUpdateTool());
    this.registerTool(new ProjectAssignTool());
    this.registerTool(new ProjectArchiveTool());
    this.registerTool(new ProjectHealthTool());
    this.registerTool(new ProjectProgressTool());
    this.registerTool(new TeamWorkloadTool());

    // CRM / Sales Production Tools
    this.registerTool(new LeadCreateTool());
    this.registerTool(new LeadFindTool());
    this.registerTool(new LeadGetTool());
    this.registerTool(new LeadUpdateTool());
    this.registerTool(new LeadAssignTool());
    this.registerTool(new LeadStatusTool());

    this.registerTool(new CustomerCreateTool());
    this.registerTool(new CustomerFindTool());
    this.registerTool(new CustomerGetTool());
    this.registerTool(new CustomerUpdateTool());

    this.registerTool(new ContactCreateTool());
    this.registerTool(new ContactFindTool());
    this.registerTool(new ContactGetTool());
    this.registerTool(new ContactUpdateTool());

    this.registerTool(new DealCreateTool());
    this.registerTool(new DealFindTool());
    this.registerTool(new DealGetTool());
    this.registerTool(new DealUpdateTool());
    this.registerTool(new DealAssignTool());
    this.registerTool(new DealMoveTool());
    this.registerTool(new DealCloseTool());

    this.registerTool(new PipelineSummaryTool());
    this.registerTool(new StaleDealsTool());
    this.registerTool(new OverdueFollowupsTool());
    this.registerTool(new CRMActivityTool());
  }

  public registerTool(tool: IAITool): void {
    this.tools.set(tool.id, tool);
  }

  public getTool(toolId: string): IAITool | undefined {
    return this.tools.get(toolId);
  }

  public hasTool(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  public listTools(allowedToolIds?: string[]): ToolDefinition[] {
    if (!allowedToolIds) {
      return this.getAllDefinitions();
    }
    return this.getToolsForAgent(allowedToolIds);
  }

  public getToolsForAgent(allowedToolIds: string[]): ToolDefinition[] {
    const definitions: ToolDefinition[] = [];

    for (const toolId of allowedToolIds) {
      const tool = this.tools.get(toolId);
      if (tool) {
        definitions.push({
          id: tool.id,
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          requiredPermissions: tool.requiredPermissions,
          riskLevel: tool.riskLevel,
          workspaceScoped: tool.workspaceScoped,
        });
      }
    }

    return definitions;
  }

  public getAllDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      requiredPermissions: tool.requiredPermissions,
      riskLevel: tool.riskLevel,
      workspaceScoped: tool.workspaceScoped,
    }));
  }
}

export const toolRegistry = ToolRegistry.getInstance();

