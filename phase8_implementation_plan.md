# Phase 8 Implementation Plan — Enterprise Notifications & Communication Infrastructure

## Current Repository Baseline
- Completed & Verified: Phase 1–7 (CRM, Projects, Tasks, Dashboard, Global Search, Finance, Documents & Knowledge Base).
- Stack: React 18, TypeScript, Vite, Node.js, Express, Prisma, MongoDB replica set (`rs0`), WebSocket (`ws`).
- Working tree: Clean, synchronized with origin/main (`4c629c0`).

## Architecture & Domain Model
1. **Prisma Schema (`apps/api/prisma/schema.prisma`)**:
   - Evolve `Notification` model with `type` (`NotificationType`), `priority` (`NotificationPriority`), `entityType`, `entityId`, `actionUrl`, `metadata`, `isArchived`, `archivedAt`.
   - Add `NotificationPreference` with per-user per-workspace category toggles (`tasksCategory`, `projectsCategory`, `crmCategory`, `financeCategory`, `documentsCategory`, `systemCategory`), channel toggles (`inAppEnabled`, `emailEnabled`, `emailAddress`), and `minPriority`.
   - Add `NotificationDelivery` for tracking delivery channels and statuses (`in_app`, `email`).
   - Add reverse relations on `User` and `Workspace`.
   - Add composite indexes: `[workspaceId, userId, isRead]`, `[workspaceId, userId, isArchived]`, `[workspaceId, userId, createdAt]`, `[workspaceId, type]`, `[workspaceId, userId]`.

2. **Packages**:
   - `@omnidesk/shared-types`: `NotificationPriority`, `NotificationType`, `NotificationSummary`, `NotificationDetail`, `NotificationPreferenceSummary`, `NotificationPreferenceInput`, `NotificationQuery`, `NotificationDeliverySummary`.
   - `@omnidesk/validation`: Zod schemas for query validation, mark read/archive, preference update.

3. **Backend Notifications Module (`apps/api/src/notifications/`)**:
   - `email/`: `email.interface.ts`, `smtp.provider.ts`, `email.service.ts` (provider-agnostic email abstraction with graceful unconfigured fallback).
   - `services/notification.service.ts`: Centralized notification engine with workspace scoping, recipient validation, preference evaluation, deduplication window, database persistence, WebSocket dispatch, and audit logging.
   - `controllers/`: `notification.controller.ts`, `notification_preference.controller.ts`.
   - `routes/notification.router.ts`: REST endpoints with authentication and RBAC middleware.
   - `websocket.ts`: Add `sendToUser` method for recipient-targeted realtime delivery.

4. **Event Integrations**:
   - Tasks & Projects: `task.service.ts` (assignment, comment), `project.service.ts`.
   - CRM: `crm.service.ts` (lead assignment, deal stage changes).
   - Finance: `finance.service.ts` (invoice sent, payment received, expense approval/rejection).
   - Knowledge: `document.service.ts` (document processed ready/failed).

5. **AI Tools (`apps/api/src/ai/tools/notification/`)**:
   - `notification_list.tool.ts`
   - `notification_unread_count.tool.ts`
   - `notification_get.tool.ts`
   - `notification_mark_read.tool.ts`
   - `notification_mark_all_read.tool.ts`
   - Registered in `tool.registry.ts`.

6. **Frontend Notification Center (`apps/web/src/components/notifications/`)**:
   - `NotificationBell.tsx`: Interactive bell with live unread badge.
   - `NotificationDropdown.tsx`: Dropdown for quick mark-read, navigation, and clearing.
   - `NotificationCenterModal.tsx`: Comprehensive notification modal with search, filters, pagination.
   - `NotificationPreferencesModal.tsx`: User configuration for notification categories and channels.
   - Integrated into `Header.tsx` and `api/client.ts`.

7. **Verification & Testing**:
   - Backend tests: `apps/api/src/notifications/routes/notifications.router.test.ts`.
   - Frontend tests: `apps/web/src/frontend_phase8_notifications.test.ts`.
   - Full regression: `npm run typecheck`, `npm test`, `npm run build`.
   - Database read-only integrity audit.
