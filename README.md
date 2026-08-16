# OmniDesk AI

> **Enterprise AI-Powered Business Operations Platform**
>
> A multi-tenant, agentic business operating system that unifies CRM, projects, task execution, finance, documents/RAG, collaboration, automation, observability, and secure AI-assisted operations.

[![Release](https://img.shields.io/badge/release-v1.0.0-success)](https://github.com/jeyar7492-glitch/omnidesk-ai/releases)
[![Tests](https://img.shields.io/badge/tests-58%2F58%20passing-success)](https://github.com/jeyar7492-glitch/omnidesk-ai)
[![PHP](https://img.shields.io/badge/PHP-8.2%2B-777BB4)](https://www.php.net/)
[![Python](https://img.shields.io/badge/Python-3.14%2B-3776AB)](https://www.python.org/)
[![Database](https://img.shields.io/badge/MariaDB%2010.4%20%2F%20MySQL%208.0-4479A1)](https://mariadb.org/)

---

## Overview

**OmniDesk AI** is designed as an enterprise operations platform rather than a standalone chatbot. It combines a deterministic business system of record with a multi-agent AI layer that can read live workspace data, reason across domains, and execute controlled business actions.

The platform is built with:

- **HTML5 + Vanilla CSS3 + Vanilla JavaScript** frontend
- **PHP 8.2+ MVC** backend with a front controller
- **MariaDB 10.4 / MySQL 8.0+** relational database
- **Python 3.14+ ASGI** agentic AI gateway
- **11 specialized AI agents** coordinated by a supervisor
- **32 registered domain tools** with permission and risk controls

> **Portfolio note:** This repository is structured as a production-style engineering project. Live credentials, `.env` files, database dumps, logs, and private runtime artifacts are intentionally excluded from Git.

## Why OmniDesk AI?

Traditional business applications fragment operations across CRM, project management, finance, documents, communication, and automation tools. Generic AI assistants add another layer but often lack authoritative data access, tenant isolation, transactional safety, and human approval controls.

OmniDesk AI addresses that gap with:

1. **One operational system of record** for business data.
2. **Live database-backed AI answers** instead of stale conversational approximations.
3. **Cross-domain agent orchestration** across business functions.
4. **Human approval for high-risk writes** such as financial mutations.
5. **Tenant isolation, RBAC, idempotency, concurrency control, and audit chaining** at the application layer.

---

## Core Capabilities

| Area | Capabilities |
|---|---|
| **Executive Intelligence** | KPIs, business health, financial summaries, project risk, executive briefings |
| **CRM** | Leads, customers, pipeline stages, conversion, follow-ups, contacts |
| **Projects** | Projects, budgets, milestones, progress, health tracking |
| **Tasks** | 6-column Kanban, priorities, dependencies, comments, assignments |
| **Finance** | Invoices, payments, receivables, expense tracking, ledger-safe calculations |
| **Knowledge / RAG** | Workspace-isolated document retrieval and semantic search |
| **Communication** | Channels, DMs, threads, notifications |
| **Meetings** | Agendas, notes, action items, task linkage |
| **Automation** | Event-condition-action workflows, bounded retries, dead-letter handling |
| **Operations** | Health, security events, audit trail, AI observability |
| **Global Search** | Cross-domain search with server-side tenant enforcement |

---

## Agentic AI Architecture

```text
                         User Request
                              │
                              ▼
                    ┌──────────────────┐
                    │ Prompt Sanitizer │
                    └────────┬─────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Multi-Agent         │
                  │ Supervisor / Router │
                  └─────────┬───────────┘
                            │
       ┌────────────┬───────┼────────┬─────────────┐
       ▼            ▼       ▼        ▼             ▼
   Executive      CRM    Project    Task        Finance
       │            │       │        │             │
       ├────────────┼───────┼────────┼─────────────┤
       ▼            ▼       ▼        ▼             ▼
   Document       Risk   Meeting Communication Operations
                            │
                            ▼
                    Automation / Planner
                            │
                            ▼
                    Controlled Tool Calls
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
          Read Operations        High-Risk Writes
                                        │
                                        ▼
                              Human Approval +
                              Action Hash Validation
```

### 11 Specialized Agents

- `executive_agent`
- `crm_agent`
- `project_agent`
- `task_agent`
- `finance_agent`
- `document_agent`
- `risk_agent`
- `meeting_agent`
- `communication_agent`
- `operations_agent`
- `automation_agent`

The supervisor can route a single request to one agent or coordinate multiple agents for cross-domain synthesis.

### 32 Domain Tools

Tools are registered with domain, permission, workspace scope, read/write classification, and risk controls. Examples include `get_kpis`, `search_leads`, `create_task`, `search_invoices`, `get_invoice`, `search_documents`, `create_project`, `record_payment`, and `convert_lead`.

---

## Enterprise Security Model

### Multi-Tenant Isolation

Every authenticated workspace operation is server-scoped. Client-supplied workspace identifiers are not trusted as an authority. Database, RAG, and AI tool operations enforce the active workspace boundary.

### RBAC

Five enterprise roles are supported:

- **Admin** — workspace and system administration
- **Manager** — team, project, and reporting oversight
- **Member** — operational read/write access within assigned scope
- **Viewer** — permitted read-only access
- **Finance** — finance and invoicing operations

### High-Risk AI Actions

Financial and other sensitive write operations require explicit human confirmation. Confirmation tokens are cryptographically bound to the action context and invalidated after successful execution to prevent replay.

### Financial Integrity

The authoritative invoice invariant is:

```text
balance_due = total_amount - paid_amount
```

Payments are protected with:

- Decimal-safe monetary calculations
- `SELECT ... FOR UPDATE` row locking
- Overpayment rejection
- Workspace-scoped idempotency keys
- Atomic transactions and rollback
- Authoritative database reads over stale AI memory

### Audit Integrity

Audit records use cryptographic hash chaining so historical tampering can be detected rather than silently repaired.

### Application Security

The production audit verified:

- No `eval`, `exec`, `shell_exec`, `system`, `passthru`, or `unserialize` usage
- No `innerHTML` or `document.write` usage in dynamic UI paths
- PDO prepared statements for database queries
- CSRF validation and hardened sessions
- Prompt-injection defenses for user and retrieved document content
- Sanitized health and operational diagnostics

---

## RAG Knowledge Vault

Documents are indexed with workspace-aware metadata. Retrieved content is treated as **data**, not executable instructions, so text inside a document cannot override system security rules or tenant boundaries.

```text
Document → Chunking → Embedding / Vector Store
                         │
                         ▼
                 workspace_id filter
                         │
                         ▼
                  Semantic Retrieval
                         │
                         ▼
                Agent Context / Answer
```

---

## Operations & Observability

The platform exposes sanitized service probes:

| Endpoint | Purpose |
|---|---|
| `GET /live` | Process liveness |
| `GET /ready` | Runtime readiness |
| `GET /health` | Detailed sanitized health diagnostics |

Operational dashboards cover:

- Service health and latency
- Security events
- Audit trail
- AI request/tool metrics
- Automation state and failures

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | PHP 8.2+ MVC / Front Controller |
| Database | MariaDB 10.4 / MySQL 8.0+, InnoDB |
| AI Gateway | Python 3.14+ ASGI |
| AI Architecture | Supervisor + 11 domain agents + 32 tools |
| Authentication | Server-side sessions + CSRF protection |
| Data Access | PDO prepared statements |
| Search / RAG | Workspace-isolated vector retrieval |

No React, Vue, Angular, Node.js, TypeScript, Tailwind, Bootstrap, Laravel, Symfony, or jQuery is required by the application architecture.

---

## Local Architecture

```text
┌──────────────────────┐
│      Browser         │
└──────────┬───────────┘
           │ HTTP
           ▼
┌──────────────────────┐       ┌─────────────────────────┐
│ PHP Front Controller │──────►│ MariaDB / MySQL :3306   │
│       :8000          │       │ Enterprise relational DB │
└──────────┬───────────┘       └─────────────────────────┘
           │
           │ HTTP / JSON
           ▼
┌──────────────────────┐
│ Python AI Gateway    │
│       :8008          │
│ Supervisor + Agents  │
└──────────────────────┘
```

---

## Installation

### Prerequisites

- PHP 8.1+; PHP 8.2+ recommended
- PHP extensions: `pdo_mysql`, `curl`, `openssl`, `json`, `session`
- MariaDB 10.4+ or MySQL 8.0+
- Python 3.10+; Python 3.14 tested
- Apache/Nginx or the PHP built-in development server

### 1. Clone

```bash
git clone https://github.com/jeyar7492-glitch/omnidesk-ai.git
cd omnidesk-ai
```

### 2. Configure environment

```bash
cp .env.example .env
```

Set production-safe values in `.env` and keep that file out of source control.

### 3. Create the database

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS omnidesk CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root omnidesk < database/schema.sql
mysql -u root omnidesk < database/seed_demo.sql
```

### 4. Start the PHP application

```bash
php -S 127.0.0.1:8000 -t public public/index.php
```

### 5. Start the AI gateway

```bash
python ai/app/main.py
```

Default local endpoints:

- Web application: `http://127.0.0.1:8000`
- AI gateway: `http://127.0.0.1:8008`

> Demo credentials, API keys, and production secrets should be supplied through a local/private environment. Do not publish credentials in this repository.

---

## Testing

The release validation covered **58 automated tests across 5 suites**:

```bash
python tests/test_e2e_browser.py
python tests/test_financial_integrity.py
python tests/test_reliability.py
python tests/test_final_forensic.py
python tests/test_production_readiness.py
```

### Release Validation

```text
58 / 58 tests passing
0 critical defects
0 high defects
0 medium defects
0 low defects
```

Coverage included:

- Browser/session E2E flows
- CSRF and authentication checks
- Financial mathematical invariants
- Concurrent payment race protection
- Idempotency and retry safety
- Audit-chain tamper detection
- Multi-agent routing
- Tool registry and RBAC checks
- Prompt-injection defenses
- Multi-tenant isolation
- Production business lifecycle
- Backup/restore validation

---

## Production Documentation

The repository includes operational documentation for deployment and administration:

- [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md)
- [`docs/ADMIN_GUIDE.md`](docs/ADMIN_GUIDE.md)
- [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md)
- [`docs/AI_GUIDE.md`](docs/AI_GUIDE.md)
- [`docs/SECURITY_GUIDE.md`](docs/SECURITY_GUIDE.md)
- [`docs/DATABASE_BACKUP_GUIDE.md`](docs/DATABASE_BACKUP_GUIDE.md)
- [`docs/AGENT_SYSTEM.md`](docs/AGENT_SYSTEM.md)
- [`docs/AI_ARCHITECTURE.md`](docs/AI_ARCHITECTURE.md)
- [`docs/AI_SECURITY.md`](docs/AI_SECURITY.md)
- [`docs/AI_TESTING.md`](docs/AI_TESTING.md)
- [`docs/AI_WORKFLOWS.md`](docs/AI_WORKFLOWS.md)
- [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md)
- [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md)

For forensic release evidence, see [`FINAL_PRODUCTION_FORENSIC_AUDIT.md`](FINAL_PRODUCTION_FORENSIC_AUDIT.md).

---

## Project Structure

```text
omnidesk-ai/
├── ai/                  # Python agentic AI gateway
│   └── app/
│       ├── agents/      # Specialized domain agents + supervisor
│       ├── services/    # Finance, RAG, idempotency, audit services
│       └── tools/       # Registered AI domain tools
├── config/              # Application configuration and bootstrap
├── core/                # Auth, security, database, routing, services
├── database/            # Schema and demonstration seed data
├── docs/                # Deployment, security, AI and admin guides
├── modules/             # CRM, projects, tasks, finance, operations, etc.
├── public/              # Front controller and public assets
├── tests/               # E2E, forensic, financial and reliability tests
├── .env.example         # Safe environment template
└── README.md
```

---

## Release Status

**OmniDesk AI v1.0.0 — Production Release**

- Live runtime validated on Windows
- PHP 8.2.12 verified
- Python 3.14.7 verified
- MariaDB 10.4.32 verified
- 51 enterprise database tables verified
- 11 specialized AI agents
- 32 registered AI tools
- 58/58 release tests passing
- Multi-tenant isolation verified
- Financial concurrency and idempotency verified
- Backup/restore drill verified

> This repository is a production-style portfolio release. A real deployment should additionally use managed secrets, HTTPS, least-privilege database accounts, production infrastructure monitoring, backups, and provider-specific LLM credentials/configuration.

---

## License

See the repository for the applicable project licensing terms.

---

**Built with PHP, Python, MariaDB/MySQL, HTML5, CSS3, Vanilla JavaScript, and agentic AI architecture.**