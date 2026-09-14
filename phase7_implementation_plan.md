# Phase 7 — Enterprise Documents + Knowledge Base + RAG Foundation Implementation Plan

## 1. Executive Summary
Phase 7 extends OmniDesk AI with an enterprise-grade Document Management, Knowledge Base, and RAG (Retrieval-Augmented Generation) foundation. The module supports document uploads with strict MIME/size validation, provider-agnostic storage abstraction, asynchronous-ready text extraction (PDF, DOCX, TXT, MD, CSV, JSON), deterministic chunking with content hashing, provider-agnostic embedding interface, hybrid retrieval (keyword + semantic scoring with Reciprocal Rank Fusion), Knowledge Base collections, version control, source-traceable citation contexts for AI, workspace tenant isolation, and RBAC permissions.

---

## 2. Actual Repository Inspection Findings
- **Database**:
  - `Document` and `DocumentChunk` models exist as basic skeletons in `apps/api/prisma/schema.prisma` lines 650–678.
  - Live records: `Document`: 0, `DocumentChunk`: 0.
  - No existing business logic, controllers, services, or routes currently reference `prisma.document`.
  - Phase 1–6 collections are healthy and intact (Workspaces: 252, Customers: 445, Projects: 1,280, Tasks: 2,428, Invoices: 0).
- **Libraries**:
  - `multer` and `@types/multer` added to `@omnidesk/api` for secure multipart upload processing.
  - `pdf-parse` added for PDF textual extraction.
  - `mammoth` added for DOCX textual extraction.
  - Native Node.js `crypto` for SHA-256 checksums and content hashing.
  - Native Node.js `fs` / `path` for isolated local storage provider.
- **AI Architecture**:
  - `apps/api/src/ai/providers/`: Provider factory supporting OpenAI, Gemini, Noop, Test providers.
  - `apps/api/src/ai/tools/`: `ToolRegistry` with 6 finance tools, 13 task/milestone tools, 9 project tools, 14 CRM tools.
  - `apps/api/src/search/services/search.service.ts`: Global search multi-entity aggregator.
- **Frontend**:
  - React 18 + TypeScript + Vite, dark-mode CSS variables, Lucide icons, `ApiClient` with workspace context headers and WebSocket subscription manager.

---

## 3. Database Schema Evolution (`apps/api/prisma/schema.prisma`)
Evolve the skeletons safely into the full Phase 7 enterprise domain:

```prisma
model Document {
  id               String          @id @default(auto()) @map("_id") @db.ObjectId
  workspaceId      String          @db.ObjectId
  workspace        Workspace       @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  name             String
  originalFileName String
  mimeType         String
  extension        String
  sizeBytes        Int
  storageProvider  String          @default("local")
  storageKey       String
  checksum         String
  status           String          @default("uploading") // uploading, processing, ready, failed, archived
  description      String?
  folder           String?         @default("/")
  ownerId          String?         @db.ObjectId
  uploadedBy       String?
  currentVersionId String?         @db.ObjectId
  isArchived       Boolean         @default(false)
  processingError  String?
  versions         DocumentVersion[]
  chunks           DocumentChunk[]
  knowledgeBases   KnowledgeBaseDocument[]
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  @@index([workspaceId, name])
  @@index([workspaceId, status])
  @@index([workspaceId, isArchived])
  @@index([workspaceId, ownerId])
  @@index([workspaceId, checksum])
  @@index([workspaceId, createdAt])
}

model DocumentVersion {
  id            String          @id @default(auto()) @map("_id") @db.ObjectId
  documentId    String          @db.ObjectId
  document      Document        @relation(fields: [documentId], references: [id], onDelete: Cascade)
  versionNumber Int
  storageKey    String
  checksum      String
  sizeBytes     Int
  extractedText String?
  createdBy     String?
  createdAt     DateTime        @default(now())
  chunks        DocumentChunk[]

  @@unique([documentId, versionNumber])
  @@index([documentId, createdAt])
}

model DocumentChunk {
  id                String          @id @default(auto()) @map("_id") @db.ObjectId
  workspaceId       String          @db.ObjectId
  workspace         Workspace       @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  documentId        String          @db.ObjectId
  document          Document        @relation(fields: [documentId], references: [id], onDelete: Cascade)
  documentVersionId String          @db.ObjectId
  documentVersion   DocumentVersion @relation(fields: [documentVersionId], references: [id], onDelete: Cascade)
  chunkIndex        Int
  content           String
  tokenCount        Int             @default(0)
  contentHash       String
  embedding         Float[]         @default([])
  metadata          Json?
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@index([workspaceId, documentId])
  @@index([workspaceId, documentVersionId])
  @@index([documentId, chunkIndex])
  @@index([documentId, contentHash])
}

model KnowledgeBase {
  id          String                  @id @default(auto()) @map("_id") @db.ObjectId
  workspaceId String                  @db.ObjectId
  workspace   Workspace               @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  name        String
  description String?
  status      String                  @default("active")
  createdBy   String?
  isArchived  Boolean                 @default(false)
  documents   KnowledgeBaseDocument[]
  createdAt   DateTime                @default(now())
  updatedAt   DateTime                @updatedAt

  @@unique([workspaceId, name])
  @@index([workspaceId, isArchived])
  @@index([workspaceId, createdAt])
}

model KnowledgeBaseDocument {
  id              String        @id @default(auto()) @map("_id") @db.ObjectId
  knowledgeBaseId String        @db.ObjectId
  knowledgeBase   KnowledgeBase @relation(fields: [knowledgeBaseId], references: [id], onDelete: Cascade)
  documentId      String        @db.ObjectId
  document        Document      @relation(fields: [documentId], references: [id], onDelete: Cascade)
  addedBy         String?
  addedAt         DateTime      @default(now())

  @@unique([knowledgeBaseId, documentId])
  @@index([knowledgeBaseId])
  @@index([documentId])
}
```

---

## 4. Architectural Components

### A. Storage Abstraction (`apps/api/src/documents/storage/`)
- `IStorageProvider`: `put(key, buffer, metadata)`, `get(key)`, `delete(key)`, `exists(key)`, `getMetadata(key)`
- `LocalStorageProvider`: Stores files in sanitized workspace-scoped paths (`uploads/documents/<workspaceId>/<key>`) with path traversal guards.
- Provider factory supporting replaceable S3 / Azure / GCS cloud backends.

### B. Text Extraction Engine (`apps/api/src/documents/extraction/`)
- Supports formats:
  - **PDF**: `pdf-parse` extracts text, page counts, metadata.
  - **DOCX**: `mammoth` extracts raw text and HTML structures.
  - **TXT & Markdown**: Direct UTF-8 textual extraction.
  - **JSON & CSV**: Structured text serialization suitable for search indexing.
- Returns clean extracted text, page count, and structural metadata. Handles image-only/scanned PDFs gracefully with explicit `isScanned: true` without fake text generation.

### C. Chunking Engine (`apps/api/src/documents/chunking/`)
- Deterministic chunking: Target chunk size (800 chars / ~200 tokens), overlap (150 chars).
- Preserves paragraph/line boundaries.
- Generates SHA-256 `contentHash` per chunk.
- Attaches documentId, versionId, chunkIndex, page/section number where applicable.

### D. Provider-Agnostic Embeddings (`apps/api/src/documents/embeddings/`)
- `IEmbeddingProvider`: `embedText(text)`, `embedTexts(texts)`, `isConfigured()`.
- Metadata records provider, model, dimension, version.
- Graceful degradation: Clearly flags semantic search as unconfigured if no live embedding API key is present, falling back to deterministic keyword retrieval.

### E. Hybrid Search & Retrieval Service (`apps/api/src/documents/services/retrieval.service.ts`)
- 3 retrieval modes:
  - `keyword`: Case-insensitive regex/term matching on chunk text and document titles.
  - `semantic`: Cosine similarity over vector embeddings when configured.
  - `hybrid`: Reciprocal Rank Fusion (RRF) combining keyword and semantic scores.
- Context Builder: Constructs clean, source-attributed RAG context items:
  `{ documentId, documentName, chunkId, content, score, page, section, citation }`.

### F. Document & Knowledge Base Services & APIs (`apps/api/src/documents/`)
- `DocumentService`: Upload, Versioning, Processing, Reprocessing, Downloading, Soft-archiving.
- `KnowledgeBaseService`: Create KB, List, Get, Update, Archive, Add/Remove Document associations.
- REST Routers:
  - `/api/v1/documents`
  - `/api/v1/documents/:id`
  - `/api/v1/documents/:id/download`
  - `/api/v1/documents/:id/versions`
  - `/api/v1/documents/:id/reprocess`
  - `/api/v1/documents/:id/chunks`
  - `/api/v1/knowledge-bases`
  - `/api/v1/knowledge-bases/:id`
  - `/api/v1/knowledge-bases/:id/documents`
  - `/api/v1/knowledge/search`

### G. Cross-Cutting Systems
- **RBAC**: `documents:read`, `documents:write`, `documents:delete`, `knowledgebase:read`, `knowledgebase:write`.
- **Tenant Isolation**: Every database query and storage path includes authoritative `workspaceId`.
- **Audit Logging**: `document.created`, `document.updated`, `document.archived`, `document.version_created`, `document.reprocessed`, `knowledge_base.created`, `knowledge_base.updated`, `knowledge.search`.
- **WebSocket Broadcasts**: `document.uploaded`, `document.processing`, `document.ready`, `document.failed`, `document.updated`, `document.archived`, `knowledge_base.updated`.
- **AI Tools**: `knowledge_search`, `knowledge_get_document`, `knowledge_get_document_context` registered in `ToolRegistry`.
- **Global Search**: SearchService queries Documents and Knowledge Bases.

### H. Frontend User Experience (`apps/web/src/components/knowledge/`)
- `DocumentsView.tsx` & `KnowledgeBaseView.tsx`:
  - Documents list with file icons, size, status badges, version count, action menus.
  - Drag-and-drop file upload with progress and type validation.
  - Document detail modal: metadata, extracted text preview, version history list.
  - Knowledge Base management: create KB, assign documents, document counts.
  - Knowledge Search interface: query input, mode selector (keyword/semantic/hybrid), search results with highlighted snippets, source citation badges, and relevance scores.
  - Navigation tab in Sidebar with `BookOpen` icon.
  - `ApiClient` methods.

---

## 5. Verification & Testing Plan
1. Schema & DB push verification (`npx prisma db push`).
2. Physical index inspection using MongoDB `$runCommandRaw({ listIndexes })`.
3. Backend integration tests (`apps/api/src/documents/routes/documents.router.test.ts`):
   - Document upload & metadata persistence
   - Text extraction (TXT, MD, JSON, CSV, PDF, DOCX)
   - Deterministic chunking & hashing
   - Version creation & chunk reprocessing
   - Knowledge Base CRUD & document association
   - Keyword, semantic, and hybrid search retrieval
   - RAG context builder with citation traceability
   - RBAC permission enforcement
   - Tenant isolation between Workspace A and B
   - Audit trail and WebSocket events
   - AI tools execution
4. Frontend integration tests (`apps/web/src/frontend_phase7_documents.test.ts`).
5. Read-only database verification of 0 orphan records and Phase 1–6 data preservation.
6. Monorepo regression: `npm run typecheck`, `npm test`, `npm run build`.
7. Git review and commit `feat(knowledge): complete enterprise documents and knowledge base`.
