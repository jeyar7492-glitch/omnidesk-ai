# OmniDesk AI

> **Enterprise AI-Powered Business Operations Platform**  
> *An Autonomous Agentic Work Operating System combining Executive Intelligence, CRM, Projects, 6-Column Task Kanban, Finance & Invoicing, Vector RAG Knowledge Vault, Team Collaboration, Workflow Automation, and Cryptographic Tamper-Evident Auditing.*

---

## 1. Overview
**OmniDesk AI** is an enterprise-grade, multi-tenant business operating system that unifies core business operations—from customer relationship management and project execution to financial ledgers and knowledge discovery—with an autonomous, multi-agent AI engine. Built with strict software engineering standards, OmniDesk AI requires zero external heavy frontend frameworks, utilizing high-performance Vanilla JavaScript and pure CSS custom properties alongside a robust PHP 8.2 MVC backend and a Python 3.14 Agentic AI orchestration gateway.

---

## 2. Problem Statement
Modern enterprises face severe fragmentation across disconnected SaaS tools:
- Disparate systems for CRM, Project Management, and Invoicing cause stale and contradictory financial figures.
- General-purpose generative AI models hallucinate data, leak cross-tenant secrets, and lack transactional safety.
- Critical operations lack deterministic idempotency and row-level locking, resulting in overpayments and ledger races.
- Fragmented logs make forensic auditing difficult and vulnerable to undetected tampering.

---

## 3. The Solution: OmniDesk AI
OmniDesk AI provides an integrated, unified system of record:
- **Authoritative Database State**: Single source of truth across CRM, Tasks, and Finance with mathematical invariant guarantees ($\text{balance} = \text{total} - \sum\text{payments}$).
- **Autonomous Multi-Agent Supervisor**: 11 domain-specific agents dynamically route intent, query live database state, and synthesize executive insights.
- **High-Risk Confirmation Guardrails**: Write actions require explicit human confirmation with cryptographic SHA-256 tokens and spent-hash replay protection.
- **Tamper-Evident Cryptographic Hash Chaining**: Immutable SHA-256 block-linked audit records detect unauthorized modifications instantly.

---

## 4. Core Features
- **Executive Intelligence Dashboard**: Real-time KPI summaries, cash-flow projections, revenue velocity, and project risk scoring.
- **Full CRM Lifecycle**: Lead scoring, 5-stage sales pipeline Kanban, customer account conversion, and contact management.
- **Project Workspaces & Milestones**: Budget tracking, milestone progress, deadline health, and team allocation.
- **6-Column Drag-and-Drop Task Kanban**: Priority tagging, assignee management, task dependencies, and activity logs.
- **Finance & Invoicing Engine**: Multi-item invoice generation, partial payment tracking, decimal-safe arithmetic, and PDF-ready print views.
- **Vector RAG Knowledge Vault**: Cosine similarity semantic search over company documents with strict workspace tenant partitioning.
- **Team Collaboration & Communication**: Channels, direct messages, contextual threads, and automated notifications.
- **Meeting Intelligence**: Agenda scheduling, live meeting minutes, action item delegation, and calendar synchronization.
- **Autonomous Workflow Automation**: Bounded event-condition-action rule engine with dead-letter queue recovery.
- **Operations & Health Center**: Real-time diagnostic probes (`/live`, `/ready`, `/health`), security event monitors, and audit trail viewers.
- **Global Search (Ctrl+K)**: Instant multi-domain fuzzy search across leads, customers, projects, tasks, invoices, and documents.

---

## 5. AI Agent Architecture
The OmniDesk AI intelligence layer operates as an asynchronous Python ASGI microservice featuring specialized domain agents coordinated by a centralized supervisor:

```
                                  ┌────────────────────────┐
                                  │   User Request / Web   │
                                  └───────────┬────────────┘
                                              │
                                  ┌───────────▼────────────┐
                                  │   Prompt Sanitizer     │
                                  │ (Injection Neutralizer)│
                                  └───────────┬────────────┘
                                              │
                                  ┌───────────▼────────────┐
                                  │ Multi-Agent Supervisor │
                                  └───────────┬────────────┘
                                              │
         ┌───────────────┬────────────────────┼───────────────────┬───────────────┐
         │               │                    │                   │               │
┌────────▼───────┐┌──────▼─────────┐ ┌────────▼─────────┐┌────────▼───────┐┌──────▼─────────┐
│ ExecutiveAgent ││   CRMAgent     │ │   ProjectAgent    ││   TaskAgent   ││  FinanceAgent   │
└────────────────┘└────────────────┘ └──────────────────┘└────────────────┘└────────────────┘
         │               │                    │                   │               │
┌────────▼───────┐┌──────▼─────────┐ ┌────────▼─────────┐┌────────▼───────┐┌──────▼─────────┐
│ DocumentAgent  ││   RiskAgent    │ │   MeetingAgent    ││ CommAgent     ││ OperationsAgent │
└────────────────┘└────────────────┘ └──────────────────┘└────────────────┘└────────────────┘
```

---

## 6. Multi-Agent Supervisor
The **Supervisor** analyzes natural language queries, detects business domain intent, checks user permissions, and invokes the appropriate specialized agent or multi-step **Planner** to execute cross-domain tasks without data hallucination.

---

## 7. AI Tool Registry (32 Registered Domain Tools)
Every tool is registered with its required RBAC permission, action type (`read` vs `write`), workspace boundary, and risk classification:

| Domain | Tools |
| :--- | :--- |
| **Executive / Dashboard** | `get_kpis`, `get_project_health`, `get_task_summary`, `get_crm_pipeline`, `get_financial_summary` |
| **CRM** | `search_customers`, `get_customer`, `search_leads`, `get_lead`, `create_lead`, `update_lead`, `create_followup`, `convert_lead` *(High-Risk)* |
| **Projects** | `search_projects`, `get_project`, `create_project`, `update_project` |
| **Tasks** | `search_tasks`, `get_task`, `create_task`, `update_task`, `move_task`, `add_task_comment` |
| **Finance** | `search_invoices`, `get_invoice`, `search_expenses`, `create_invoice` *(High-Risk)*, `record_payment` *(High-Risk)* |
| **Documents / RAG** | `search_documents`, `retrieve_document` |
| **Operations & Alerts** | `get_notifications`, `create_notification` |

---

## 8. RAG Knowledge Vault & Vector Storage
- **Isolated Storage**: Document chunks are stored and indexed strictly by `workspace_id`.
- **Passive Data Treatment**: Retrieved text is treated purely as contextual data, preventing prompt injection attacks contained inside documents from hijacking execution.

---

## 9. CRM & Sales Pipeline
- 5-Stage Kanban: `Lead` $\rightarrow$ `Contacted` $\rightarrow$ `Proposal` $\rightarrow$ `Negotiation` $\rightarrow$ `Closed Won / Lost`.
- Real-time conversion of won leads into active Customer Accounts and initial Projects.

---

## 10. Project Management & Milestones
- Workspace-scoped project tracking with customizable budget caps, assigned project managers, delivery milestones, and real-time completion percentages.

---

## 11. Task Kanban Boards
- 6-Column Workflow: `Backlog` $\rightarrow$ `To Do` $\rightarrow$ `In Progress` $\rightarrow$ `In Review` $\rightarrow$ `Testing` $\rightarrow$ `Completed`.
- Drag-and-drop support, task priorities (`urgent`, `high`, `medium`, `low`), due dates, and audit-logged comments.

---

## 12. Finance & Invoicing Engine
- Strict mathematical invariant: $\text{balance\_due} = \text{total\_amount} - \text{paid\_amount}$.
- Automatic status transitions: `unpaid` $\rightarrow$ `partially_paid` $\rightarrow$ `paid`.
- Rejection of overpayments and prevention of negative balances.

---

## 13. Team Communication & Channels
- Topic-specific public/private channels and 1-on-1 direct messaging with real-time DOM updates and XSS-safe text rendering.

---

## 14. Meetings & Action Item Intelligence
- Agenda scheduling with integrated markdown notes and automatic extraction/assignment of action items linked to project task boards.

---

## 15. Workflow Automation Engine
- Event-Condition-Action rule engine (e.g., *On Invoice Paid $\rightarrow$ Send Notification & Move Project Milestone*).
- Bounded retries (maximum 3 attempts) and dead-letter queue transition for unrecoverable errors.

---

## 16. Operations, Health & Observability
- **Liveness Probe** (`GET /live`): Fast ping checking process availability.
- **Readiness Probe** (`GET /ready`): Confirms database connectivity and vector store readiness.
- **Health Diagnostics** (`GET /health`): Full subsystem check returning JSON health status.
- **Sanitized Diagnostics**: Operational dashboards never expose internal credentials, session tokens, or raw paths.

---

## 17. Global Search (Ctrl+K)
- Single keyboard shortcut opening an instant modal searching across CRM leads, customers, projects, tasks, invoices, and documents with server-side tenant isolation.

---

## 18. Security Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      OMNIDESK AI SECURITY                   │
├──────────────────────────────┬──────────────────────────────┤
│ 1. Zero Unsafe PHP           │ 0 eval, shell_exec, passthru │
│ 2. Zero Unsafe DOM APIs      │ 100% textContent (No innerHTML)│
│ 3. Parameterized Queries     │ 100% PDO Prepared Statements │
│ 4. CSRF Protection           │ Timing-safe hash_equals()    │
│ 5. Session Hardening         │ HttpOnly, SameSite=Strict    │
│ 6. Replay Attack Defense     │ Spent Action Hash Validation │
│ 7. Rate Limiting             │ Brute-force Account Lockout  │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 19. Role-Based Access Control (RBAC)
Granular permissions mapped across 5 standard enterprise roles:
1. **Admin**: Full workspace configuration, user management, and module access.
2. **Manager**: Team oversight, project management, and reporting.
3. **Member**: Standard read/write access to assigned projects, tasks, and discussions.
4. **Viewer**: Read-only access to permitted modules.
5. **Finance**: Dedicated access to invoicing, ledger reports, and payment processing.

---

## 20. Multi-Tenant Workspace Isolation
- Every database entity is partitioned with `workspace_id`.
- URL tampering, POST payload manipulation, and cross-workspace object ID substitutions are blocked server-side (HTTP 403 / 404).

---

## 21. Financial Production Safety & Decimal Integrity
- Monetary computations use decimal-safe calculations.
- Overpayment attempts are rejected authoritatively before touching the database.
- Authoritative database values supersede cached or conversational AI memory.

---

## 22. Concurrency Row Locking & Idempotency
- **Transaction-Safe Row Locking**: `SELECT ... FOR UPDATE` ensures concurrent payment attempts on the same invoice are processed sequentially.
- **Workspace-Scoped Idempotency**: Transactions bearing an `Idempotency-Key` return identical cached receipts on accidental double-submissions.

---

## 23. Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | **HTML5, Vanilla CSS3, Vanilla JS** | Zero bloated dependencies; instantaneous load times; safe DOM APIs |
| **Backend** | **PHP 8.2+ (MVC Architecture)** | Type-safe, high-performance Front Controller routing with PDO |
| **Database** | **MariaDB 10.4 / MySQL 8.0** | Relational integrity with 51 InnoDB tables and foreign key constraints |
| **AI Layer** | **Python 3.14+ (ASGI Gateway)** | Autonomous multi-agent coordination, vector RAG embeddings, and tool routing |

---

## 24. System Architecture
```
  [Browser Client] ──(HTTP/JSON)──► [PHP Web Server (Port 8000)]
                                           │
                        ┌──────────────────┴──────────────────┐
                        ▼                                     ▼
             [MySQL / MariaDB (3306)]             [Python AI Gateway (8008)]
             (51 InnoDB Relational Tables)        (Multi-Agent Supervisor & RAG)
```

---

## 25. Database Architecture
- **Total Tables**: 51 normalized enterprise tables.
- **Engine**: InnoDB with UTF8mb4 character set.
- **Integrity**: Explicit foreign keys with cascading rules and composite indexes.

---

## 26. Installation & Prerequisites
- **PHP**: 8.1 or higher (PHP 8.2+ recommended with `pdo_mysql`, `curl`, `openssl`, `json`, `session`).
- **MySQL / MariaDB**: MySQL 8.0+ or MariaDB 10.4+.
- **Python**: 3.10+ (Python 3.14 tested).
- **Web Server**: Apache, Nginx, or PHP built-in CLI server.

---

## 27. Environment Configuration
Copy the configuration template:
```bash
cp .env.example .env
```
Ensure your `.env` contains:
```ini
APP_ENV=production
APP_DEBUG=false
APP_URL=http://localhost:8000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=omnidesk
DB_USERNAME=root
DB_PASSWORD=
PYTHON_AI_HOST=127.0.0.1
PYTHON_AI_PORT=8008
```

---

## 28. Running the PHP Web Application
Start the PHP development server using the Front Controller router:
```bash
php -S 127.0.0.1:8000 -t public public/index.php
```

---

## 29. Running the Python AI Gateway
Start the autonomous AI daemon:
```bash
python ai/app/main.py
```
*(Runs on `http://127.0.0.1:8008`)*

---

## 30. Database Setup & Migrations
Import the schema and demonstration data:
```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS omnidesk CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root omnidesk < database/schema.sql
mysql -u root omnidesk < database/seed_demo.sql
```

---

## 31. Demonstration Credentials
> **NOTE**: For demonstration/testing environments only.

| Role | Email | Password |
| :--- | :--- | :--- |
| **System Administrator** | `demo-admin@omnidesk.io` | `Admin@123` |
| **Internal Admin** | `admin@omnidesk.internal` | `Admin@123` |
| **Team Member** | `demo-user@omnidesk.io` | `DemoUser2024!` |

---

## 32. Automated Testing Suite (58/58 Tests Passing)
Run all automated test suites:
```bash
# 1. Master Forensic & Zero-Defect Validator
python tests/test_final_forensic.py

# 2. Live Browser & Session E2E Suite (16 Routes)
python tests/test_e2e_browser.py

# 3. Financial Integrity & Invariant Suite
python tests/test_financial_integrity.py

# 4. Concurrency & Disaster Recovery Suite
python tests/test_reliability.py

# 5. Production Readiness & Business Lifecycle Suite
python tests/test_production_readiness.py
```

---

## 33. Safe Backup & Disaster Recovery Drill
Create a live database backup:
```bash
mysqldump -u root omnidesk --single-transaction --routines --triggers > storage/backups/omnidesk_backup.sql
```
Restore the database backup:
```bash
mysql -u root omnidesk < storage/backups/omnidesk_backup.sql
```

---

## 34. Project Structure
```
omnidesk-ai/
├── ai/                      # Python Multi-Agent AI Engine & Vector Store
│   └── app/
│       ├── agents/          # Domain Agents (Executive, Finance, CRM, etc.)
│       ├── services/        # Vector RAG, Idempotency, Audit Chaining
│       └── tools/           # 32 Domain Tools with RBAC & Confirmation
├── config/                  # Bootstrap, constants, environment loader
├── core/                    # Security, Database (PDO), Auth, Session, Router
├── database/                # Schema DDL (schema.sql) & Seed (seed_demo.sql)
├── docs/                    # Production, Deployment, and Architecture Guides
├── modules/                 # Modular MVC Controllers & Views
│   ├── AI/                  # AI Command Center & Human Approvals Queue
│   ├── CRM/                 # Lead Pipeline & Customer Management
│   ├── Dashboard/           # Executive & Team Dashboards
│   ├── Finance/             # Invoices, Payments & Expenses
│   ├── Operations/          # Observability, Audit Trail & Health Diagnostics
│   ├── Projects/            # Projects & Milestone Tracking
│   └── Tasks/               # 6-Column Task Kanban Board
├── public/                  # Document Root (index.php, CSS, app.js)
├── storage/                 # Logs, backups, and file storage
└── tests/                   # 5 Comprehensive Automated Test Suites
```

---

## 35. Screenshot Checklist
Refer to [docs/SCREENSHOT_CHECKLIST.md](file:///C:/Users/jeyar/projects/omnidesk-ai/docs/SCREENSHOT_CHECKLIST.md) for capturing the 18 key interface views.

---

## 36. Future Cloud Deployment
- **Containerization**: Deployable via Docker / Docker Compose with PHP-FPM, Nginx, MariaDB, and Python ASGI.
- **Enterprise High Availability**: Compatible with AWS ECS/EKS, Google Cloud Run, and Azure Container Apps.

---

## 37. License
This project is licensed under the **MIT License** — see the LICENSE file for details.
