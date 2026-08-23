import { AgentExecutionContext, RiskLevel, ToolCallProposal } from "@omnidesk/shared-types";
import { IAgent } from "./agent.interface";

export class SupervisorAgent implements IAgent {
  public readonly id = "supervisor";
  public readonly name = "OmniDesk Supervisor Agent";
  public readonly description =
    "Central enterprise reasoning and orchestrating agent that analyzes user intent, determines domain workflows, validates permissions, and safely coordinates tool execution.";
  public readonly capabilities = [
    "intent_recognition",
    "plan_generation",
    "task_management",
    "system_inspection",
    "workflow_routing",
    "security_validation",
    "approval_coordination",
  ];
  public readonly allowedTools = [
    // System Diagnostic Tools
    "system_ping",
    "workspace_info",
    "system_maintenance",
    // Task Management Tools
    "task_find",
    "task_get",
    "task_create",
    "task_update",
    "task_move",
    "task_assign",
    "task_comment",
    "task_list_overdue",
  ];
  public readonly systemInstructions = `You are the OmniDesk AI Supervisor Agent — the central reasoning engine for OmniDesk AI.
Your role:
1. Receive and understand the user's intent.
2. Formulate a step-by-step execution plan.
3. Select appropriate tools from the authorized tools list.
4. Execute operations strictly inside the user's authenticated workspace.
5. Respect enterprise governance, RBAC permissions, and human approval policies.`;

  public readonly riskPolicy: RiskLevel = "HIGH";
  public readonly maxExecutionSteps = 8;
  public readonly timeoutMs = 30000;

  public systemPrompt(context: AgentExecutionContext): string {
    return `${this.systemInstructions}

EXECUTION CONTEXT:
- Workspace ID: ${context.workspaceId}
- User ID: ${context.userId}
- User Role: ${context.userRole}
- User Permissions: ${context.userPermissions.join(", ") || "none"}

AVAILABLE DOMAINS & TOOLS:
1. Task Management:
   - task_find: Search and filter tasks (query, status, priority, assignee, overdue)
   - task_get: Retrieve specific task details and comment history
   - task_create: Create a new task (title, description, priority, assignee, dueDate)
   - task_update: Update task details or priority
   - task_move: Move task between stages (backlog -> todo -> in_progress -> review -> done)
   - task_assign: Assign task to workspace member
   - task_comment: Add a discussion comment to a task
   - task_list_overdue: List all overdue tasks in the workspace
2. System Diagnostics:
   - system_ping: Low-risk diagnostic ping
   - workspace_info: Workspace metadata query
   - system_maintenance: High-risk maintenance (requires human approval)

REASONING GUIDELINES:
1. For queries like "Show my overdue tasks", propose 'task_list_overdue' or 'task_find' with isOverdue=true.
2. For task creation commands like "Create a task called X and assign to Y", call 'task_create' with title="X" and assigneeNameOrEmail="Y".
3. For workflow transitions like "Move the X task to review", find the task if ID unknown ('task_get' or 'task_find'), then call 'task_move' with targetStatus="review".
4. Never invent nonexistent tasks or fake IDs. If a task is not found, report it clearly.
5. Respect workspace boundaries. Never attempt to query or modify data outside workspace '${context.workspaceId}'.
6. High-risk operations will automatically pause for human operator approval.`;
  }

  public evaluateRisk(proposal: ToolCallProposal): RiskLevel {
    if (proposal.toolId === "system_maintenance") {
      return "HIGH";
    }

    // High risk parameter checks
    const args = JSON.stringify(proposal.arguments || {}).toLowerCase();
    if (args.includes("delete_all") || args.includes("purge") || args.includes("truncate")) {
      return "HIGH";
    }

    if (
      proposal.toolId === "task_create" ||
      proposal.toolId === "task_update" ||
      proposal.toolId === "task_move" ||
      proposal.toolId === "task_assign"
    ) {
      return "MEDIUM";
    }

    return "LOW";
  }
}
