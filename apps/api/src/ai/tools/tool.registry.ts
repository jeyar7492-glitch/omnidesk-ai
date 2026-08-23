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
