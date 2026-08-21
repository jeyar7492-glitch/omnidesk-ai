# OmniDesk AI v1.0.0 — Administrator Operations Guide

## 1. Overview
The OmniDesk AI Admin Suite provides centralized controls for:
- System Health Monitoring (`/operations/health`)
- Security Event Logging & Threat Interception (`/operations/security`)
- Enterprise Audit Trail (`/operations/audit`)
- AI Observability & Performance Metrics (`/operations/ai`)
- Autonomous Automation Rules (`/automation`)

## 2. System Health & Diagnostics (`/operations/health`)
Monitors real-time status of:
- **Application Core**: Bootstrap and class autoloader state.
- **MySQL Database**: Read/write connectivity and query latency.
- **Python AI Gateway**: Active health ping to `127.0.0.1:8008/v1/health`.
- **Storage Subsystem**: Permissions and available volume space.
- **Authentication**: Session handler health and cookie parameters.

## 3. Security Event Monitoring (`/operations/security`)
Monitors real-time security events categorized by severity:
- `INFO`: Normal administrative state changes.
- `WARNING`: Failed login attempts, invalid CSRF attempts.
- `HIGH`: Confirmation action hash mismatches, rate limit triggers.
- `CRITICAL`: Prompt injection attempt intercepted by sanitizer.

## 4. Role-Based Access Control (RBAC) Management
OmniDesk AI defines 5 core enterprise roles:
1. **Admin**: Full access across all workspaces, operations, finance, and system settings.
2. **Manager**: Team capacity, project creation, task management, approvals, standup prep.
3. **Member**: Standard workspace read/write access to tasks, documents, and meetings.
4. **Viewer**: Read-only access to assigned projects and tasks.
5. **Finance**: Invoice creation, payment recording, financial reporting, and expense management.

## 5. Maintenance & Troubleshooting
- **Log Location**: `storage/logs/` (Application logs).
- **Public Health Ping**: `/health` returns lightweight JSON `{ status: "healthy" }` without exposing internal topology.
