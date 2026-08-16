"""
OmniDesk AI — Autonomous Multi-Agent Orchestrator (Phase 8)

Orchestrates multi-agent routing, structured planning, RBAC permission verification,
high-risk write confirmation checks with action hash binding, execution, and audit logging.
"""

from typing import Dict, Any, List
from app.security import AISecurity
from app.agents.supervisor import Supervisor
from app.agents.planner import Planner
from app.agents.executive_agent import ExecutiveAgent
from app.agents.crm_agent import CRMAgent
from app.agents.project_agent import ProjectAgent
from app.agents.task_agent import TaskAgent
from app.agents.finance_agent import FinanceAgent
from app.agents.document_agent import DocumentAgent
from app.agents.risk_agent import RiskAgent
from app.tools.registry import registry

class AgentOrchestrator:
    AGENT_MAP = {
        "executive_agent": ExecutiveAgent,
        "crm_agent": CRMAgent,
        "project_agent": ProjectAgent,
        "task_agent": TaskAgent,
        "finance_agent": FinanceAgent,
        "document_agent": DocumentAgent,
        "risk_agent": RiskAgent,
    }

    @classmethod
    def process_request(cls, request_data: Dict[str, Any]) -> Dict[str, Any]:
        raw_message = request_data.get("message", "")
        context     = request_data.get("context", {})
        user_id     = context.get("user_id", 1)
        user_perms  = context.get("permissions", [])
        user_role   = context.get("role", "member")
        ws_id       = context.get("workspace_id", 1)
        conv_id     = request_data.get("conversation_id", "conv_1")

        # 1. Prompt Injection Defense
        clean_message = AISecurity.sanitize_input(raw_message)

        # 2. Multi-Agent Supervisor Routing & Planning
        target_agent_key = Supervisor.route_request(clean_message)
        agent_cls = cls.AGENT_MAP.get(target_agent_key, ExecutiveAgent)
        plan = Planner.create_plan(clean_message, context)

        # 3. Tool Selection & Risk Check
        selected_tool_name = request_data.get("tool_name") or cls._select_tool(clean_message)
        if not selected_tool_name and request_data.get("confirmed") and ("payment" in clean_message.lower() or "confirm" in clean_message.lower()):
            selected_tool_name = "record_payment"

        requires_confirm   = False
        action_hash        = None
        agent_output       = None
        tool_output        = None

        if selected_tool_name:
            tool = registry.get_tool(selected_tool_name)
            if tool:
                # 4. RBAC Check

                if not AISecurity.verify_tool_permission(tool.name, tool.permission, user_perms, user_role):
                    return {
                        "conversation_id": conv_id,
                        "response": f"Access Denied: You do not possess required permission [{tool.permission}] for action '{tool.name}'.",
                        "status": "error",
                        "requires_confirmation": False,
                        "actions": [],
                        "agent_key": target_agent_key
                    }

                action_hash = AISecurity.generate_action_hash(conv_id, tool.name, user_id, ws_id)

                # 5. High-Risk Write Confirmation Check
                if tool.requires_confirmation and not request_data.get("confirmed", False):
                    return {
                        "conversation_id": conv_id,
                        "response": f"Confirmation Required: Action '{tool.name}' is a high-risk write operation. Please confirm in Approval Center.",
                        "status": "waiting_confirmation",
                        "requires_confirmation": True,
                        "action_hash": action_hash,
                        "actions": [{"tool": tool.name, "params": request_data.get("tool_params", {})}],
                        "agent_key": target_agent_key
                    }

                # 6. Verify Action Hash on Confirmation
                if tool.requires_confirmation and request_data.get("confirmed", False):
                    provided_hash = request_data.get("action_hash")
                    if provided_hash and not AISecurity.verify_action_hash(conv_id, tool.name, user_id, ws_id, provided_hash):
                        return {
                            "conversation_id": conv_id,
                            "response": "Security Violation: Invalid action hash or replay attack detected.",
                            "status": "error",
                            "requires_confirmation": False,
                            "actions": [],
                            "agent_key": target_agent_key
                        }

                tool_output = tool.handler(context, request_data.get("tool_params", {}))

        # 7. Delegate Execution to Specialized Domain Agent or Format Factsheet
        if selected_tool_name == "get_invoice":
            # Search policy from vector store if query mentions policy/interest/sla
            doc = None
            if "policy" in clean_message.lower() or "interest" in clean_message.lower() or "late" in clean_message.lower() or "sla" in clean_message.lower():
                from app.services.vector_service import vector_store
                docs = vector_store.similarity_search(ws_id, "late payment interest SLA policy")
                if docs:
                    doc = docs[0]
            agent_response = FinanceAgent.format_invoice_factsheet(tool_output, doc)
        else:
            agent_response = agent_cls.execute(context, request_data.get("params", {}))

        if tool_output and selected_tool_name and selected_tool_name != "get_invoice":
            agent_response += f"\n\n[Action Executed by {agent_cls.key}: {selected_tool_name}]"

        return {
            "conversation_id": conv_id,
            "response": agent_response,
            "status": "completed",
            "requires_confirmation": requires_confirm,
            "action_hash": action_hash,
            "agent_key": target_agent_key,
            "plan": plan,
            "actions": [{"tool": selected_tool_name}] if selected_tool_name else [],
            "sources": [{"type": "database", "workspace_id": ws_id}]
        }

    @classmethod
    def _select_tool(cls, message: str) -> str:
        msg = message.lower()
        if "payment" in msg and "record" in msg:
            return "record_payment"
        elif "create" in msg and "task" in msg:
            return "create_task"
        elif "create" in msg and "lead" in msg:
            return "create_lead"
        elif "create" in msg and "invoice" in msg:
            return "create_invoice"
        elif "inv-" in msg or ("invoice" in msg and ("balance" in msg or "interest" in msg or "exact" in msg or "detail" in msg)):
            return "get_invoice"
        elif "kpi" in msg or "briefing" in msg or "summary" in msg:
            return "get_kpis"
        elif "risk" in msg or "health" in msg:
            return "get_project_health"

        elif "task" in msg or "kanban" in msg:
            return "search_tasks"
        elif "lead" in msg or "crm" in msg:
            return "search_leads"
        elif "invoice" in msg or "unpaid" in msg:
            return "search_invoices"
        elif "expense" in msg:
            return "search_expenses"
        elif "document" in msg or "policy" in msg:
            return "search_documents"
        return None


