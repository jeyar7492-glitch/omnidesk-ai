"""
OmniDesk AI — Multi-Agent Supervisor Router (Phase 8)

Inspects user intent and routes execution to specialized domain agents
(Executive, CRM, Project, Task, Finance, Document, Risk).
"""

from typing import Dict, Any

class Supervisor:
    @classmethod
    def route_request(cls, message: str) -> str:
        """
        Determine target domain agent key based on message intent.
        """
        msg = message.lower()

        if "health" in msg or "risk" in msg or "anomaly" in msg:
            return "risk_agent"
        elif "lead" in msg or "customer" in msg or "deal" in msg or "crm" in msg:
            return "crm_agent"
        elif "project" in msg or "milestone" in msg or "code" in msg:
            return "project_agent"
        elif "task" in msg or "kanban" in msg or "todo" in msg or "backlog" in msg:
            return "task_agent"
        elif "invoice" in msg or "payment" in msg or "expense" in msg or "revenue" in msg or "profit" in msg:
            return "finance_agent"
        elif "document" in msg or "policy" in msg or "sla" in msg or "vault" in msg:
            return "document_agent"
        else:
            return "executive_agent"
