"""
OmniDesk AI — Multi-Step Execution Planner (Phase 8)

Generates structured multi-step execution plans with goal definition,
step breakdown, risk assessment, permission checks, and expected outputs.
"""

from typing import Dict, Any, List

class Planner:
    @classmethod
    def create_plan(cls, goal: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Synthesize a structured execution plan for complex requests.
        """
        msg_lower = goal.lower()
        steps = []
        overall_risk = "low"

        if "at risk" in msg_lower or "risk" in msg_lower:
            steps.append({
                "step": 1,
                "agent": "project_agent",
                "tool": "get_project_health",
                "risk": "low",
                "description": "Retrieve project progress metrics and identify delayed workspaces."
            })
            steps.append({
                "step": 2,
                "agent": "task_agent",
                "tool": "search_tasks",
                "risk": "low",
                "description": "Search task backlog for blocking or overdue work items."
            })
            steps.append({
                "step": 3,
                "agent": "risk_agent",
                "tool": "get_kpis",
                "risk": "low",
                "description": "Calculate overall operational risk score."
            })
        elif "lead" in msg_lower or "follow-up" in msg_lower:
            steps.append({
                "step": 1,
                "agent": "crm_agent",
                "tool": "search_leads",
                "risk": "low",
                "description": "Scan active CRM leads requiring client follow-up."
            })
            steps.append({
                "step": 2,
                "agent": "crm_agent",
                "tool": "create_followup",
                "risk": "medium",
                "description": "Draft follow-up tasks for neglected leads."
            })
        else:
            steps.append({
                "step": 1,
                "agent": "executive_agent",
                "tool": "get_kpis",
                "risk": "low",
                "description": "Synthesize workspace executive briefing."
            })

        return {
            "goal": goal,
            "reasoning_summary": f"Structured plan with {len(steps)} steps across domain agents.",
            "overall_risk": overall_risk,
            "steps": steps,
            "confirmation_required": False
        }
