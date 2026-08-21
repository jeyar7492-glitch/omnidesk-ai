# OmniDesk AI — AI System Testing Guide

## Agentic AI Core Test Suite
1. **Executive Briefing**: Verify `get_kpis` tool execution and Business Health calculation.
2. **Project Risk Analysis**: Verify `get_project_health` tool execution and delayed project identification.
3. **Task Backlog Query**: Verify `search_tasks` tool execution with priority scoring.
4. **CRM Neglected Leads**: Verify `search_leads` and follow-up recommendation generation.
5. **Unpaid Invoices**: Verify `search_invoices` filtering for `status != 'paid'`.
6. **Financial Summary**: Verify `get_financial_summary` gross revenue and net profit calculation.
7. **Multi-Agent Synthesis**: Verify multi-agent delegation across Executive, Project, Task, and Risk agents.
8. **Low-Risk Write**: Verify `create_task` tool execution.
9. **High-Risk Write Confirmation**: Verify `record_payment` triggers `waiting_confirmation` and requires SHA-256 `action_hash`.
10. **Prompt Injection Refusal**: Verify prompt override refusal and zero cross-workspace data leakage.
