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
    // Task Management Tools
    "task_find",
    "task_get",
    "task_create",
    "task_update",
    "task_move",
    "task_assign",
    "task_comment",
    "task_list_overdue",
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
1. Receive and understand user intent across CRM/Sales, Task Management, and Workspace operations.
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
1. CRM & Sales Pipeline:
   - Leads: lead_find, lead_get, lead_create, lead_update, lead_assign, lead_status
   - Customers: customer_find, customer_get, customer_create, customer_update
   - Contacts: contact_find, contact_get, contact_create, contact_update
   - Deals & Pipeline: deal_find, deal_get, deal_create, deal_update, deal_assign, deal_move, deal_close
   - Analytics & Activities: pipeline_summary, stale_deals, overdue_followups, crm_activity
2. Task Management:
   - task_find, task_get, task_create, task_update, task_move, task_assign, task_comment, task_list_overdue
3. System Diagnostics:
   - system_ping, workspace_info, system_maintenance

REASONING GUIDELINES:
1. Natural language intent:
   - "Show my pipeline value" or "How is the sales pipeline doing?" -> call 'pipeline_summary'
   - "Which deals are stale/inactive?" -> call 'stale_deals'
   - "Show overdue followups" -> call 'overdue_followups'
   - "Find leads from Acme" -> call 'lead_find' with query="Acme"
   - "Move Acme deal to negotiation" -> if deal ID unknown, find deal with 'deal_find' or 'deal_get', then call 'deal_move' with targetStage="NEGOTIATION"
   - "Close Acme deal as WON" -> call 'deal_close' with outcome="WON"
   - "Add a follow-up note to Acme deal" -> call 'crm_activity' with entityType="deal"
2. Never invent fake IDs, company names, or monetary amounts. Always look up real database records.
3. If multiple records match an entity name, resolve or state the ambiguity clearly.
4. All operations are strictly confined to workspace '${context.workspaceId}'.
5. High-risk operations (e.g. closing deals, system maintenance) automatically pause for human operator approval.`;
  }

  public evaluateRisk(proposal: ToolCallProposal): RiskLevel {
    if (proposal.toolId === "system_maintenance" || proposal.toolId === "deal_close") {
      return "HIGH";
    }

    // High risk parameter checks
    const args = JSON.stringify(proposal.arguments || {}).toLowerCase();
    if (args.includes("delete_all") || args.includes("purge") || args.includes("truncate")) {
      return "HIGH";
    }

    // Medium risk mutating operations
    if (
      proposal.toolId.startsWith("lead_") ||
      proposal.toolId.startsWith("customer_") ||
      proposal.toolId.startsWith("contact_") ||
      proposal.toolId.startsWith("deal_") ||
      proposal.toolId.startsWith("task_")
    ) {
      if (
        proposal.toolId.endsWith("_create") ||
        proposal.toolId.endsWith("_update") ||
        proposal.toolId.endsWith("_assign") ||
        proposal.toolId.endsWith("_move") ||
        proposal.toolId.endsWith("_status")
      ) {
        return "MEDIUM";
      }
    }

    return "LOW";
  }
}
