"""
OmniDesk AI — Cryptographic Audit Chain Service (Phase 14)

Maintains tamper-evident hash chains of all critical events:
current_hash = SHA256(previous_hash + canonical_event_payload)
"""

from typing import Dict, Any, List
import hashlib
import json

class AuditChainService:
    GENESIS_HASH = "0" * 64
    _chains: Dict[int, List[Dict[str, Any]]] = {}

    @classmethod
    def append(cls, ws_id: int, event_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
        if ws_id not in cls._chains:
            cls._chains[ws_id] = []

        chain = cls._chains[ws_id]
        previous_hash = chain[-1]["current_hash"] if chain else cls.GENESIS_HASH
        canonical_payload = json.dumps(payload, sort_keys=True)
        current_hash = hashlib.sha256(f"{previous_hash}:{canonical_payload}".encode('utf-8')).hexdigest()

        block = {
            "event_id": event_id,
            "previous_hash": previous_hash,
            "canonical_payload": canonical_payload,
            "current_hash": current_hash,
            "is_verified": True
        }
        chain.append(block)
        return block

    @classmethod
    def verify_chain(cls, ws_id: int) -> Dict[str, Any]:
        chain = cls._chains.get(ws_id, [])
        if not chain:
            return {"status": "VERIFIED", "is_valid": True, "total_verified": 0}

        expected_prev = cls.GENESIS_HASH
        for idx, block in enumerate(chain):
            if block["previous_hash"] != expected_prev:
                return {
                    "status": "AUDIT_INTEGRITY_FAILURE",
                    "is_valid": False,
                    "tampered_block": idx,
                    "error": f"Broken chain link at block #{idx}"
                }

            recalculated = hashlib.sha256(f"{expected_prev}:{block['canonical_payload']}".encode('utf-8')).hexdigest()
            if block["current_hash"] != recalculated:
                return {
                    "status": "AUDIT_INTEGRITY_FAILURE",
                    "is_valid": False,
                    "tampered_block": idx,
                    "error": f"Payload hash mismatch at block #{idx}"
                }

            expected_prev = block["current_hash"]

        return {"status": "VERIFIED", "is_valid": True, "total_verified": len(chain)}
