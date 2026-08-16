"""
OmniDesk AI — Document Agent (Phase 8)

Performs workspace-isolated semantic RAG search against document vault and extracts information.
"""

from typing import Dict, Any
from app.services.vector_service import vector_store

class DocumentAgent:
    key = "document_agent"
    domain = "document"
    risk_level = "low"

    @classmethod
    def execute(cls, context: Dict[str, Any], params: Dict[str, Any]) -> str:
        ws_id = context.get("workspace_id", 1)
        query = params.get("query", "billing terms SLA")
        results = vector_store.similarity_search(ws_id, query)

        if results:
            top = results[0]
            return f"Document Search Results (Source: {top['title']}):\n\"{top['content']}\" (Relevance Score: {top['score']})"
        return "No relevant workspace documents found matching query."
