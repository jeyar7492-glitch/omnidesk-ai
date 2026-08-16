# OmniDesk AI v1.0.0 — Enterprise Security Guide

## 1. Security Principles
- **Authoritative PHP Boundary**: Python AI never authenticates clients directly. All client requests flow through PHP with active session verification.
- **Strict Multi-Tenant Isolation**: 100% of database queries enforce `workspace_id = :ws` resolved server-side from `DashboardService::getActiveWorkspace()`.
- **Server-Side RBAC**: Permissions verified at Route, Controller, and AI Tool invocation layers.

## 2. Injection & XSS Protection
- **SQL Injection**: 100% PDO prepared statements. Zero SQL concatenation.
- **XSS Defense**: Zero dynamic `innerHTML` or `document.write`. All dynamic JavaScript output uses safe `textContent` DOM nodes.
- **Prompt Injection**: Sanitizer strips override commands (`ignore previous instructions`, `reveal system prompt`, `disable security`).

## 3. Session & Cookie Security
- **Cookie Flags**: `HttpOnly`, `SameSite=Strict`, `Secure` (in production HTTPS).
- **CSRF Defense**: `Security::requireValidCsrf()` on all POST / AJAX requests.
- **Rate Limiting**: Login brute-force protection with account lockout after 5 consecutive failures.
