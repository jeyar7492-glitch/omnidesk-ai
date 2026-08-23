import { ToolDefinition } from "@omnidesk/shared-types";
import { IAITool } from "./tool.interface";
import { SystemPingTool } from "./built-in/system_ping.tool";
import { WorkspaceInfoTool } from "./built-in/workspace_info.tool";
import { SystemMaintenanceTool } from "./built-in/system_maintenance.tool";
import { TaskFindTool } from "./task/task_find.tool";
import { TaskGetTool } from "./task/task_get.tool";
import { TaskCreateTool } from "./task/task_create.tool";
import { TaskUpdateTool } from "./task/task_update.tool";
import { TaskMoveTool } from "./task/task_move.tool";
import { TaskAssignTool } from "./task/task_assign.tool";
import { TaskCommentTool } from "./task/task_comment.tool";
import { TaskListOverdueTool } from "./task/task_list_overdue.tool";

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
    const list: ToolDefinition[] = [];
    for (const [id, tool] of this.tools.entries()) {
      if (!allowedToolIds || allowedToolIds.includes(id)) {
        list.push({
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
    return list;
  }
}

export const toolRegistry = ToolRegistry.getInstance();
