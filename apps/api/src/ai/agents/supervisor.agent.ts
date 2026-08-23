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
    "project_management",
    "task_decomposition",
    "milestone_tracking",
    "dependency_resolution",
    "project_health_diagnostics",
    "team_workload_analysis",
    "crm_sales_management",
    "pipeline_forecasting",
    "lead_qualification",
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

    // Project Management Tools
    "project_find",
    "project_get",
    "project_create",
    "project_update",
    "project_assign",
    "project_archive",
    "project_health",
    "project_progress",
    "team_workload",

    // Task Management Tools
    "task_find",
    "task_get",
    "task_create",
    "task_update",
    "task_move",
    "task_assign",
    "task_comment",
    "task_list_overdue",
    "task_checklist_create",
    "task_checklist_update",
    "task_dependency_create",
    "task_dependency_remove",
    "task_blockers",

    // Milestone Tools
    "milestone_create",
    "milestone_find",
    "milestone_get",
    "milestone_update",
    "milestone_complete",
    "milestone_overdue",

    // CRM / Sales Tools
    "lead_create",
    "lead_find",
    "lead_get",
    "lead_update",
    "lead_assign",
    "lead_status",
    "customer_create",
    "customer_find",
    "customer_get",
    "customer_update",
    "contact_create",
    "contact_find",
    "contact_get",
    "contact_update",
    "deal_create",
    "deal_find",
    "deal_get",
    "deal_update",
    "deal_assign",
    "deal_move",
    "deal_close",
    "pipeline_summary",
    "stale_deals",
    "overdue_followups",
    "crm_activity",
  ];

  public readonly systemInstructions = `You are the OmniDesk AI Supervisor Agent — the central reasoning engine for OmniDesk AI.
Your role:
1. Receive and understand user intent across Project Management, Task Decomposition, Milestones, CRM/Sales, and Workspace operations.
2. Formulate step-by-step execution plans.
3. Select appropriate tools from the authorized tools list.
4. Execute operations strictly inside the user's authenticated workspace.
5. Respect enterprise governance, RBAC permissions, and human approval policies.`;

  public readonly riskPolicy: RiskLevel = "HIGH";
  public readonly maxExecutionSteps = 10;
  public readonly timeoutMs = 30000;

  public systemPrompt(context: AgentExecutionContext): string {
    return `${this.systemInstructions}

EXECUTION CONTEXT:
- Workspace ID: ${context.workspaceId}
- User ID: ${context.userId}
- User Role: ${context.userRole}
- User Permissions: ${context.userPermissions.join(", ") || "none"}

AVAILABLE DOMAINS & TOOLS:
1. Project Management & Health Analytics:
   - Projects: project_find, project_get, project_create, project_update, project_assign, project_archive, project_health, project_progress, team_workload
   - Milestones: milestone_find, milestone_get, milestone_create, milestone_update, milestone_complete, milestone_overdue
2. Task Management & Decomposition:
   - Tasks: task_find, task_get, task_create, task_update, task_move, task_assign, task_comment, task_list_overdue
   - Checklists / Subtasks: task_checklist_create, task_checklist_update
   - Dependencies & Blockers: task_dependency_create, task_dependency_remove, task_blockers
3. CRM & Sales Pipeline:
   - Leads: lead_find, lead_get, lead_create, lead_update, lead_assign, lead_status
   - Customers: customer_find, customer_get, customer_create, customer_update
   - Contacts: contact_find, contact_get, contact_create, contact_update
   - Deals & Pipeline: deal_find, deal_get, deal_create, deal_update, deal_assign, deal_move, deal_close
   - Analytics & Activities: pipeline_summary, stale_deals, overdue_followups, crm_activity
4. System Diagnostics:
   - system_ping, workspace_info, system_maintenance

REASONING GUIDELINES:
1. Natural language intent:
   - "Show my tasks" / "Find overdue tasks" -> call 'task_find' or 'task_list_overdue'
   - "How is Project Alpha doing?" / "Which projects are at risk?" -> call 'project_health' or 'project_find'
   - "Break this task into a checklist" -> call 'task_checklist_create' with structured subtask items
   - "Why is this task blocked?" / "What tasks are blocking the release?" -> call 'task_blockers' or 'task_get'
   - "Create a milestone for the payment release" -> call 'milestone_create'
   - "Show team workload" / "Who has the highest overdue workload?" -> call 'team_workload'
   - "Archive Project Alpha" -> call 'project_archive' (HIGH-RISK, pauses for human approval)
   - "Move the task to review" -> call 'task_move' with targetStatus="review"
2. Never invent fake IDs, company names, task names, or monetary amounts. Always look up real database records.
3. If multiple records match an entity name, resolve or state the ambiguity clearly.
4. All operations are strictly confined to workspace '${context.workspaceId}'.
5. High-risk operations (e.g. archiving projects, closing deals, system maintenance) automatically pause for human operator approval.`;
  }

  public evaluateRisk(proposal: ToolCallProposal): RiskLevel {
    if (
      proposal.toolId === "system_maintenance" ||
      proposal.toolId === "deal_close" ||
      proposal.toolId === "project_archive"
    ) {
      return "HIGH";
    }

    // High risk parameter checks
    const args = JSON.stringify(proposal.arguments || {}).toLowerCase();
    if (args.includes("delete_all") || args.includes("purge") || args.includes("truncate") || args.includes("archive_all")) {
      return "HIGH";
    }

    // Medium risk mutating operations
    if (
      proposal.toolId.startsWith("project_") ||
      proposal.toolId.startsWith("task_") ||
      proposal.toolId.startsWith("milestone_") ||
      proposal.toolId.startsWith("lead_") ||
      proposal.toolId.startsWith("customer_") ||
      proposal.toolId.startsWith("contact_") ||
      proposal.toolId.startsWith("deal_")
    ) {
      if (
        proposal.toolId.endsWith("_create") ||
        proposal.toolId.endsWith("_update") ||
        proposal.toolId.endsWith("_assign") ||
        proposal.toolId.endsWith("_move") ||
        proposal.toolId.endsWith("_status") ||
        proposal.toolId.endsWith("_complete") ||
        proposal.toolId.endsWith("_remove")
      ) {
        return "MEDIUM";
      }
    }

    return "LOW";
  }
}
