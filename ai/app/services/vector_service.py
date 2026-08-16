"""
OmniDesk AI — Vector Storage & RAG Retrieval Engine (Phase 7)

Workspace-isolated vector store supporting document chunk indexing, similarity search,
and source attribution while preventing cross-workspace vector data leakage.
"""

import math
from typing import List, Dict, Any
from app.services.embedding_service import EmbeddingService

class VectorStore:
    def __init__(self):
        # In-memory vector store indexed by workspace_id
        self._store: Dict[int, List[Dict[str, Any]]] = {}

    def index_document(self, workspace_id: int, doc_id: str, title: str, content: str) -> int:
        """
        Chunk, embed, and store document in vector store under strict workspace_id boundary.
        """
        if workspace_id not in self._store:
            self._store[workspace_id] = []

        chunks = EmbeddingService.chunk_text(content)
        count = 0
        for idx, chunk in enumerate(chunks):
            embedding = EmbeddingService.generate_embedding(chunk)
            self._store[workspace_id].append({
                "doc_id": doc_id,
                "chunk_id": f"{doc_id}_chunk_{idx}",
                "title": title,
                "content": chunk,
                "embedding": embedding
            })
            count += 1
        return count

    def similarity_search(self, workspace_id: int, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Perform cosine similarity search against workspace-scoped vector chunks.
        """
        if workspace_id not in self._store or not self._store[workspace_id]:
            # Seed default workspace knowledge if empty
            self._seed_workspace_knowledge(workspace_id)

        query_vec = EmbeddingService.generate_embedding(query)
        chunks = self._store.get(workspace_id, [])

        scored_chunks = []
        for chunk in chunks:
            similarity = self._cosine_similarity(query_vec, chunk["embedding"])
            scored_chunks.append((similarity, chunk))

        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, chunk in scored_chunks[:top_k]:
            results.append({
                "title": chunk["title"],
                "content": chunk["content"],
                "score": round(score, 4),
                "doc_id": chunk["doc_id"]
            })
        return results

    def _cosine_similarity(self, vec_a: List[float], vec_b: List[float]) -> float:
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def _seed_workspace_knowledge(self, workspace_id: int):
        self.index_document(
            workspace_id,
            "doc_101",
            "OmniDesk Platform SLA & Billing Policy",
            "Invoices are issued on Net 30 terms. Late payments accrue 1.5% monthly interest. High-risk write operations require supervisor confirmation."
        )
        self.index_document(
            workspace_id,
            "doc_102",
            "CRM & Lead Handling SOP",
            "All leads in negotiation stage require follow-up calls every 7 days. High priority projects must maintain >80% progress."
        )

# Global Vector Store Instance
vector_store = VectorStore()
