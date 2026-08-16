# OmniDesk AI — Security & Human Approval Controls

## Security Boundaries

1. **PHP Authoritative Perimeter**: Authentication (`Auth::check()`), session verification, and active workspace resolution (`DashboardService::getActiveWorkspace()`) are enforced in PHP before any cURL request reaches Python.
2. **Server-side RBAC**: Every tool invocation validates `AISecurity::verify_tool_permission()` against `Auth::permissions()`.
3. **Cryptographic Action Hash**: High-risk WRITE actions (`record_payment`, `create_invoice`, `convert_lead`) generate SHA-256 bound payloads: `SHA256(conv_id : tool_name : user_id : ws_id : SALT)`. Replay or spoofed action approvals are rejected.
4. **Prompt Injection Defense**: `AISecurity::sanitize_input()` strips instruction overrides (`ignore previous instructions`, `reveal system prompt`, `disable security`, `bypass rbac`).
