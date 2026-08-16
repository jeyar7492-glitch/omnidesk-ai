# OmniDesk AI — Screenshot Presentation Checklist

This checklist details the 18 key user interface views to capture for GitHub repositories, portfolios, and demonstration slides:

| # | Screen / View | URL Path | Key Elements to Showcase |
| :- | :--- | :--- | :--- |
| **1** | **Authentication Screen** | `/login` | Glassmorphic card, CSRF protection badge, clean input states, dark/light toggle |
| **2** | **Executive Dashboard** | `/dashboard` | KPI metrics widgets, cash flow cards, project health progress, recent activities feed |
| **3** | **CRM Leads & Contacts** | `/crm` | Customer account directory, lead scoring badges, contact cards, action dropdowns |
| **4** | **Sales Pipeline Kanban** | `/crm/pipeline` | 5-stage drag-and-drop board, deal values, lead stage progression |
| **5** | **Projects Directory** | `/projects` | Project workspace cards, milestone progress bars, budget allocation caps |
| **6** | **Task Kanban Board** | `/tasks` | 6-column workflow board, priority tags (urgent/high/med), assignee badges |
| **7** | **Finance Overview** | `/finance` | Revenue velocity, balance due summary, payment distribution chart |
| **8** | **Invoice Details & Print** | `/finance/invoices` | Multi-item itemized invoice, payment history ledger, PDF-ready print preview |
| **9** | **Vector RAG Knowledge Vault** | `/documents` | Document upload, indexed chunks, semantic search query bar, similarity results |
| **10** | **Team Communication** | `/communication` | Topic channel feed, direct message list, message timestamping, clean threads |
| **11** | **Meetings & Action Items** | `/meetings` | Scheduled meetings calendar, markdown meeting notes, assigned action items |
| **12** | **AI Command Center** | `/ai/command-center` | Multi-agent interactive chat terminal, agent selection pills, live output stream |
| **13** | **Human Approval Center** | `/ai/command-center` | Pending high-risk write confirmation modal, SHA-256 token display, Approve/Reject |
| **14** | **Operations Health Monitor**| `/operations/health` | Subsystem status tiles (DB, Cache, Python AI, Storage), probe latencies |
| **15** | **Security Event Monitor** | `/operations/security`| Rate limiting triggers, failed login attempts, timing-safe error log |
| **16** | **Cryptographic Audit Trail**| `/operations/audit` | SHA-256 block-linked audit records, integrity status badge (`VALID` vs `TAMPERED`)|
| **17** | **AI Metrics & Observability**| `/operations/ai` | Agent call volumes, tool execution counts, average reasoning latencies |
| **18** | **Global Search Modal** | `Ctrl+K` / `/search`| Multi-domain search overlay indexing CRM, Projects, Tasks, and Invoices |

---

### Screenshot Best Practices
- Capture screenshots in high-resolution (1920×1080 or retina 2x).
- Capture both **Dark Mode** and **Light Mode** variations for the Executive Dashboard and Task Kanban.
- Save images into a `docs/screenshots/` directory for embedding in the README.
