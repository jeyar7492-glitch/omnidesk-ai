

# OmniDesk AI (v1.0.0 Enterprise Release)

OmniDesk AI is an enterprise-grade Autonomous Agentic Work Operating System combining Executive Workspaces, CRM, Projects, 6-Column Task Kanban Boards, Invoicing & Finance, Document Knowledge Vault (RAG), Team Channels, Meetings & Action Items, Autonomous Automation, and Multi-Agent AI Orchestration.

---

## 🚀 Technology Stack
- **Frontend**: HTML5, Vanilla CSS3, Vanilla JavaScript (Zero external libraries, 100% safe DOM `textContent`).
- **Backend**: PHP 8.1+ MVC-style Front Controller (PDO Prepared Statements, CSRF Guard, Server-Side RBAC).
- **Database**: MySQL 8.0+ (19 Enterprise Tables, Strict Foreign Keys & Multi-Tenant Partitioning).
- **AI Layer**: Python 3.11+ ASGI Service (11 Specialized Domain Agents, Supervisor Router, Structured Planner, Vector RAG Store, SHA-256 Action Hash Confirmation Guard).

---

## 📁 Repository Structure
```
omnidesk-ai/
├── ai/                      # Python 3.11+ Autonomous AI Gateway & Multi-Agent Engine
│   └── app/
│       ├── agents/          # 11 Specialized Domain Agents (Executive, CRM, Finance, etc.)
│       ├── services/        # Vector RAG, LLM Service, Embedding Engine
│       └── tools/           # 24 Domain Tools with independent RBAC & confirmation
├── config/                  # Bootstrap, constants, environment loader
├── core/                    # Auth, Database, Security, Router, HealthService, Session
├── database/                # Schema DDL (schema.sql) and realistic seed demo (seed_demo.sql)
├── docs/                    # Complete production guides (Deployment, Admin, User, AI, Security, Backup)
├── modules/                 # Modular domain controllers & views
│   ├── AI/                  # Autonomous AI Command Center & Approvals Queue
│   ├── Auth/                # Authentication, Registration, Password Recovery
│   ├── Automation/          # Autonomous Event Triggers & Rule Engine
│   ├── CRM/                 # Customers, Contacts, Deals, Sales Pipeline
│   ├── Communication/       # Channels, Direct Messages, Threading
│   ├── Dashboard/           # Executive, Manager, and Employee My-Work Dashboards
│   ├── Documents/           # Document Vault & RAG Indexing
│   ├── Finance/             # Invoices, Payments, Expenses, Vendor Billing
│   ├── Meetings/            # Meetings Scheduler, Notes & Action Items
│   ├── Operations/          # System Health Diagnostics & Security Event Monitor
│   ├── Projects/            # Project Workspaces & Milestone Tracking
│   └── Tasks/               # 6-Column Drag-and-Drop Task Kanban Board
├── public/                  # Web document root (index.php, CSS design tokens, app.js)
├── storage/                 # Secure document storage & application logs
└── .env.example             # Production configuration template
```

---

## 📖 Documentation & Operations Guides
- [Production Deployment Guide](file:///C:/Users/jeyar/projects/omnidesk-ai/docs/DEPLOYMENT_GUIDE.md)
- [Administrator Operations Guide](file:///C:/Users/jeyar/projects/omnidesk-ai/docs/ADMIN_GUIDE.md)
- [User Workspaces Guide](file:///C:/Users/jeyar/projects/omnidesk-ai/docs/USER_GUIDE.md)
- [Agentic AI Platform Guide](file:///C:/Users/jeyar/projects/omnidesk-ai/docs/AI_GUIDE.md)
- [Enterprise Security Guide](file:///C:/Users/jeyar/projects/omnidesk-ai/docs/SECURITY_GUIDE.md)
- [Database Backup & Disaster Recovery Guide](file:///C:/Users/jeyar/projects/omnidesk-ai/docs/DATABASE_BACKUP_GUIDE.md)

---

## 🔒 Security Summary
- **Zero unsafe PHP functions** (`eval`, `exec`, `shell_exec`, `system`, `passthru`, `unserialize`).
- **Zero unsafe DOM APIs** (`innerHTML`, `document.write`).
- **100% Prepared Statements** across all database interactions.
- **Cryptographically Bound Action Hashes** (`SHA256(conv_id:tool_name:user_id:ws_id:SALT)`) preventing replay attacks.
- **Strict Multi-Tenant Isolation** enforcing `workspace_id = :ws` from authenticated server-side sessions.
