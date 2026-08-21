# OmniDesk AI v1.0.0 — Agentic AI Platform Guide

## 1. Architecture Overview
OmniDesk AI employs a multi-agent supervisor architecture in Python 3.11+:
- **Supervisor Router (`supervisor.py`)**: Classifies user intent and delegates to specialized domain agents.
- **Execution Planner (`planner.py`)**: Builds structured multi-step execution plans.
- **Security Confirmation Guard (`security.py`)**: Validates SHA-256 Action Hashes for write tools.

## 2. 11 Specialized Domain Agents
1. **Executive Agent (`executive_agent.py`)**: Business Health Index synthesis (84/100) & financial briefings.
2. **CRM Agent (`crm_agent.py`)**: Lead negotiation tracking & neglected lead follow-ups.
3. **Project Agent (`project_agent.py`)**: Project risk detection & milestone progress.
4. **Task Agent (`task_agent.py`)**: Task backlog analysis, priority scoring & workload balancing.
5. **Finance Agent (`finance_agent.py`)**: Invoiced receivables, overdue payments & cash flow forecasting.
6. **Document Agent (`document_agent.py`)**: Workspace-isolated vector RAG search & citations.
7. **Risk Agent (`risk_agent.py`)**: Operational anomaly scoring & mitigation recommendations.
8. **Meeting Agent (`meeting_agent.py`)**: Notes summarization & action item extraction.
9. **Communication Agent (`communication_agent.py`)**: Channel summaries & thread discussions.
10. **Operations Agent (`operations_agent.py`)**: System telemetry & service health metrics.
11. **Automation Agent (`automation_agent.py`)**: Trigger monitoring & condition execution.

## 3. High-Risk Action Confirmation Flow
When an agent requests a high-risk write action (e.g. `record_payment` or `create_invoice`):
1. Tool registry flags `requires_confirmation = True`.
2. Python generates a cryptographically bound action hash:
   `action_hash = SHA256(conv_id : tool_name : user_id : ws_id : SALT)`
3. Response returns status `waiting_confirmation`.
4. User explicitly confirms via Human Approval Center (`/ai/confirm`).
5. Python verifies `action_hash` matches before executing tool exactly once.
6. Replay attempts are rejected with `403 Security Violation`.
