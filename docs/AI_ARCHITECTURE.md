# OmniDesk AI — Autonomous Business Agent Platform Architecture

## Overview
OmniDesk AI features a multi-tiered 3-layer architecture:

1. **Enterprise HTML5/CSS3/Vanilla JS UI**: Renders the AI Command Center, Business Health Index, Proactive Insights, and Human Approval Queue.
2. **PHP 8.1+ Web Application**: Serves as the authoritative security boundary for authentication, RBAC authorization, workspace isolation (`workspace_id`), and PDO transactions.
3. **Python 3.11+ Autonomous AI Engine**: Multi-agent supervisor, planner, specialized domain agents, tool registry, and vector RAG store.

## Architecture Flow

```
HTML5 / CSS3 / Vanilla JS UI
           ↓
PHP AI Controller (Route Guard / CSRF / Session Auth)
           ↓
PHP AIService Gateway (cURL JSON over loopback http://127.0.0.1:8008)
           ↓
Python AI Gateway (app/main.py)
           ↓
Multi-Agent Supervisor & Planner (supervisor.py / planner.py)
           ↓
Specialized Domain Agents (Executive, CRM, Project, Task, Finance, Document, Risk)
           ↓
Strict Tool Registry (24 Domain Tools)
           ↓
Security Sanitizer & SHA-256 Action Hash Confirmation Guard
           ↓
MySQL 8+ Enterprise Database & Audit Event Log
```
