import { ToolDefinition } from "@omnidesk/shared-types";
import { IAITool } from "./tool.interface";
import { SystemPingTool } from "./built-in/system_ping.tool";
import { WorkspaceInfoTool } from "./built-in/workspace_info.tool";
import { SystemMaintenanceTool } from "./built-in/system_maintenance.tool";

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
    this.registerTool(new SystemPingTool());
    this.registerTool(new WorkspaceInfoTool());
    this.registerTool(new SystemMaintenanceTool());
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
