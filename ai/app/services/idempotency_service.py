"""
OmniDesk AI — Transaction Idempotency Service (Phase 14)

Provides single-execution guarantees for high-risk write operations.
"""

from typing import Dict, Any, Optional
import hashlib
import json
from datetime import datetime

class IdempotencyService:
    # Workspace-scoped idempotency store: {ws_id: {idempotency_key: record}}
    _store: Dict[int, Dict[str, Dict[str, Any]]] = {}

    @classmethod
    def check(cls, ws_id: int, key: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not key:
            return None

        ws_store = cls._store.get(ws_id, {})
        record = ws_store.get(key)
        if record:
            return {
                "is_duplicate": True,
                "status": record["status"],
                "response_payload": record["response_payload"],
                "created_at": record["created_at"]
            }
        return {"is_duplicate": False}

    @classmethod
    def record(cls, ws_id: int, user_id: int, tool_name: str, key: str, payload: Dict[str, Any], response: Dict[str, Any]):
        if not key:
            return

        if ws_id not in cls._store:
            cls._store[ws_id] = {}

        cls._store[ws_id][key] = {
            "user_id": user_id,
            "tool_name": tool_name,
            "request_hash": hashlib.sha256(json.dumps(payload, sort_keys=True).encode('utf-8')).hexdigest(),
            "response_payload": response,
            "status": "completed",
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
