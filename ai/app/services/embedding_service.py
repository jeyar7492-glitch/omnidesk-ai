"""
OmniDesk AI — Embedding & Document Chunking Service (Phase 7)

Provides document chunking, text normalization, and vector embedding generation
with workspace context isolation.
"""

import re
import math
from typing import List, Dict, Any

class EmbeddingService:
    @classmethod
    def chunk_text(cls, text: str, chunk_size: int = 300, overlap: int = 50) -> List[str]:
        """
        Split raw document text into overlapping token-aware chunks.
        """
        if not text:
            return []

        words = text.split()
        chunks = []
        i = 0
        while i < len(words):
            chunk = " ".join(words[i : i + chunk_size])
            chunks.append(chunk)
            i += (chunk_size - overlap)
        return chunks

    @classmethod
    def generate_embedding(cls, text: str, vector_dim: int = 64) -> List[float]:
        """
        Generate a deterministic 64-dimensional vector embedding for similarity search.
        In production, this delegates to Google Gemini or OpenAI Embeddings API.
        """
        if not text:
            return [0.0] * vector_dim

        # Deterministic hashing-based pseudo-embedding generator
        vec = [0.0] * vector_dim
        for idx, char in enumerate(text.lower()):
            pos = ord(char) % vector_dim
            vec[pos] += math.sin(idx + ord(char))

        # L2 Normalization
        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [v / norm for v in vec]
        return vec
