# OmniDesk AI (v2.0.0 Enterprise Release)

OmniDesk AI is an enterprise-grade Autonomous Agentic Work Operating System combining Executive Dashboards, Multi-Agent AI Orchestration, CRM & Sales Pipeline, Projects & Milestone Roadmaps, 6-Column Task Kanban Boards, Tenant-Isolated Global Search, and Real-Time WebSocket Telemetry.

---

## 🚀 Technology Stack

- **Monorepo**: TypeScript, npm workspaces
- **Frontend (`apps/web`)**: React 18, Vite, Vanilla CSS Design System, Lucide Icons, WebSocket Live Client
- **Backend (`apps/api`)**: Node.js, Express, Prisma ORM, JWT, Bcrypt, Helmet, CORS, WebSocket Server (`ws`)
- **Shared Packages**:
  - `@omnidesk/shared-types`: Unified domain interfaces, DTOs, Enums, and WebSocket event types
  - `@omnidesk/validation`: Strict Zod validation schemas for all API payloads and search queries
  - `@omnidesk/config`: Shared environment definitions and configuration tokens
- **Database**: MongoDB 7.0+ Replica Set (`rs0`)
- **Testing**: Vitest, Supertest (164 passing automated unit and integration tests)

---

## 📁 Repository Architecture

```
omnidesk-ai/
├── apps/
│   ├── api/                     # Express REST & WebSocket API Gateway
│   │   ├── prisma/              # Prisma schema & MongoDB client definition
│   │   └── src/
│   │       ├── ai/              # Multi-Agent Foundation (Supervisor, Tools, Approvals)
│   │       ├── auth/            # Authentication, JWT rotation, bcrypt, RBAC
│   │       ├── crm/             # CRM (Customers, Contacts, Leads, Deals, Pipeline)
│   │       ├── dashboard/       # Executive Dashboard aggregation service & controller
│   │       ├── projects/        # Project workspace, milestones, health, progress
│   │       ├── routes/          # API v1 route registry & health checks
│   │       ├── search/          # Tenant-isolated global search engine
│   │       └── tasks/           # 6-column Kanban task engine, workloads, checklists
│   └── web/                     # React 18 + Vite SPA Frontend
│       └── src/
│           ├── api/             # HTTP & WebSocket client infrastructure
│           ├── components/
│           │   ├── ai/          # AI Supervisor execution & human approval modal
│           │   ├── auth/        # Login & Registration views
│           │   ├── crm/         # Sales pipeline & CRM deal management
│           │   ├── dashboard/   # Executive command center dashboard view
│           │   ├── layout/      # Sidebar, Header with search trigger, Status badges
│           │   ├── projects/    # Project roadmap & milestone tracker
│           │   ├── search/      # Global search modal (Ctrl+K / Cmd+K palette)
│           │   ├── system/      # System architecture & diagnostic telemetry
│           │   └── tasks/       # 6-column Kanban board with live drag-and-drop
│           └── context/         # Workspace and Auth Context Provider
├── packages/
│   ├── shared-types/            # Canonical TypeScript domain models
│   ├── validation/              # Canonical Zod schemas
│   └── config/                  # Configuration tokens
├── scripts/                     # Automated live verification drill scripts
│   ├── test_prisma_connection.ts
│   ├── verify_security_live.ts
│   ├── verify_pm_live.ts
│   ├── verify_crm_live.ts
│   ├── verify_frontend_integration.ts
│   └── verify_phase3_live.ts
└── tsconfig.base.json
```

---

## 🔒 Security & Governance

1. **Server-Authoritative Multi-Tenancy**: All workspace decisions derive strictly from authenticated server-side JWT context (`req.context.workspaceId`), never trusting client headers or body params.
2. **Cryptographically Protected Approvals**: High-risk actions (`project_archive`, `deal_delete`, etc.) require cryptographic approval tokens with SHA-256 integrity protection and prevent AI self-approval.
3. **Authentication & Token Rotation**: Bcrypt password hashing, 15-minute JWT access tokens, 7-day single-use rotating refresh tokens, and revocation blacklisting.
4. **Tenant-Isolated WebSocket Events**: Real-time events broadcast only to verified members of the originating workspace.
5. **No Credential Exposure**: Sensitive fields (`passwordHash`, `refreshToken`, JWT secrets) are stripped from all API outputs.

---

## ⚡ Getting Started Locally

### Prerequisites
- Node.js 20+
- MongoDB 7.0+ with replica set enabled (`rs0`) on `127.0.0.1:27017`

### Installation & Build
```bash
# Install dependencies
npm install

# Build shared packages
npm run build:packages

# Run full TypeScript validation
npm run typecheck

# Execute entire test suite
npm test

# Build production bundles
npm run build
```

### Running the Services
```bash
# Start backend API (port 4000)
npm --workspace=@omnidesk/api run dev

# Start frontend application (port 5173)
npm --workspace=@omnidesk/web run dev
```

---

## 🧪 Verification Drills

Execute all live verification scripts against local MongoDB `rs0`:
```bash
# Security & RBAC verification
npx tsx scripts/verify_security_live.ts

# Project Management verification
npx tsx scripts/verify_pm_live.ts

# CRM & Sales Pipeline verification
npx tsx scripts/verify_crm_live.ts

# Frontend Integration workflow verification
npx tsx scripts/verify_frontend_integration.ts

# Phase 3 Executive Dashboard & Global Search verification
npx tsx scripts/verify_phase3_live.ts
```
