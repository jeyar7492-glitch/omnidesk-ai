"""
OmniDesk AI — Security & Prompt Injection Sanitizer (Phase 7)

Ensures untrusted business data and user inputs cannot override system safety instructions,
mask sensitive secrets (passwords, tokens, keys), and enforce RBAC permission checks.
"""

import re
from typing import Dict, Any, List

class AISecurity:
    PROMPT_INJECTION_PATTERNS = [
        re.compile(r"ignore\s+(all\s+)?(previous\s+|security\s+)?(instructions|rules)", re.IGNORECASE),
        re.compile(r"reveal\s+(the\s+)?(system\s+)?prompt", re.IGNORECASE),
        re.compile(r"disable\s+(security|rbac|auth)", re.IGNORECASE),
        re.compile(r"bypass\s+(rbac|security|auth|permissions)", re.IGNORECASE),
        re.compile(r"delete\s+database", re.IGNORECASE),
        re.compile(r"dump\s+users", re.IGNORECASE),
    ]

    SECRET_MASK_PATTERNS = [
        re.compile(r"(password|token|secret|api_key|auth_key|bearer)\s*[:=]\s*['\"]?[^\s'\"]+['\"]?", re.IGNORECASE),
    ]

    @classmethod
    def sanitize_input(cls, text: str) -> str:
        """
        Detect prompt injection patterns and replace suspicious overrides with safe placeholders.
        """
        if not text:
            return ""

        sanitized = text
        for pattern in cls.PROMPT_INJECTION_PATTERNS:
            if pattern.search(sanitized):
                sanitized = pattern.sub("[SUSPICIOUS INSTRUCTION REMOVED]", sanitized)
        return sanitized

    @classmethod
    def mask_secrets(cls, text: str) -> str:
        """
        Mask any credentials before passing to LLM or vector storage.
        """
        if not text:
            return ""

        masked = text
        for pattern in cls.SECRET_MASK_PATTERNS:
            masked = pattern.sub(r"\1: [MASKED]", masked)
        return masked

    @classmethod
    def verify_tool_permission(cls, tool_name: str, required_perm: str, user_permissions: List[str], user_role: str) -> bool:
        """
        Enforce server-side RBAC on tool invocation.
        Admin role bypasses permission check.
        """
        if user_role == "admin":
            return True
        return required_perm in user_permissions

    _spent_hashes = set()

    @classmethod
    def generate_action_hash(cls, conversation_id: str, tool_name: str, user_id: int, workspace_id: int) -> str:
        """
        Cryptographically bind confirmation payloads to prevent replay attacks or inferred confirmations.
        """
        import hashlib
        raw = f"{conversation_id}:{tool_name}:{user_id}:{workspace_id}:OMNIDESK_SALT_2026"
        return hashlib.sha256(raw.encode('utf-8')).hexdigest()[:16]

    @classmethod
    def verify_action_hash(cls, conversation_id: str, tool_name: str, user_id: int, workspace_id: int, action_hash: str) -> bool:
        if action_hash in cls._spent_hashes:
            return False  # Already executed / Replay attempt

        expected = cls.generate_action_hash(conversation_id, tool_name, user_id, workspace_id)
        if expected == action_hash:
            cls._spent_hashes.add(action_hash)  # Mark as spent
            return True
        return False


