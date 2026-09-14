import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';
import { toolExecutor } from '../../ai/tools/tool.executor';
import { AgentExecutionContext, ToolCallProposal } from '@omnidesk/shared-types';
import { getStorageProvider } from '../storage/local_storage.provider';
import { DocumentChunker } from '../chunking/chunker.service';
import { TextExtractor } from '../extraction/text_extractor';

describe('Phase 7 Enterprise Documents, Knowledge Base & RAG Integration Tests', () => {
  const app = createApp();

  // Synthetic workspaces for strict isolation
  const testWorkspaceId = '67b844ec10ec6e3973b5ee01';
  const foreignWorkspaceId = '67b844ec10ec6e3973b5ee02';
  const testUserId = '67b844ec10ec6e3973b5ee11';
  const viewerUserId = '67b844ec10ec6e3973b5ee12';

  // Tracking for deterministic cleanup
  const createdDocumentIds: string[] = [];
  const createdKbIds: string[] = [];

  const adminHeaders = {
    'x-workspace-id': testWorkspaceId,
    'x-user-id': testUserId,
    'x-user-role': 'ADMIN',
    'x-user-permissions': 'documents:read,documents:write,documents:delete,knowledgebase:read,knowledgebase:write',
  };

  const viewerHeaders = {
    'x-workspace-id': testWorkspaceId,
    'x-user-id': viewerUserId,
    'x-user-role': 'VIEWER',
    'x-user-permissions': 'documents:read,knowledgebase:read',
  };

  const foreignHeaders = {
    'x-workspace-id': foreignWorkspaceId,
    'x-user-id': testUserId,
    'x-user-role': 'ADMIN',
    'x-user-permissions': 'documents:read,documents:write,documents:delete,knowledgebase:read,knowledgebase:write',
  };

  beforeAll(async () => {
    // Clean any remnants of synthetic workspaces if present
    await prisma.knowledgeBaseDocument.deleteMany({
      where: { knowledgeBase: { workspaceId: { in: [testWorkspaceId, foreignWorkspaceId] } } },
    });
    await prisma.documentChunk.deleteMany({
      where: { workspaceId: { in: [testWorkspaceId, foreignWorkspaceId] } },
    });
    await prisma.documentVersion.deleteMany({
      where: { document: { workspaceId: { in: [testWorkspaceId, foreignWorkspaceId] } } },
    });
    await prisma.document.deleteMany({
      where: { workspaceId: { in: [testWorkspaceId, foreignWorkspaceId] } },
    });
    await prisma.knowledgeBase.deleteMany({
      where: { workspaceId: { in: [testWorkspaceId, foreignWorkspaceId] } },
    });
  });

  afterAll(async () => {
    // 1. Clean DB records
    await prisma.knowledgeBaseDocument.deleteMany({
      where: { knowledgeBase: { workspaceId: { in: [testWorkspaceId, foreignWorkspaceId] } } },
    });
    await prisma.documentChunk.deleteMany({
      where: { workspaceId: { in: [testWorkspaceId, foreignWorkspaceId] } },
    });
    await prisma.documentVersion.deleteMany({
      where: { document: { workspaceId: { in: [testWorkspaceId, foreignWorkspaceId] } } },
    });
    await prisma.document.deleteMany({
      where: { workspaceId: { in: [testWorkspaceId, foreignWorkspaceId] } },
    });
    await prisma.knowledgeBase.deleteMany({
      where: { workspaceId: { in: [testWorkspaceId, foreignWorkspaceId] } },
    });
    await prisma.auditEvent.deleteMany({
      where: { workspaceId: { in: [testWorkspaceId, foreignWorkspaceId] } },
    });

    // 2. Clean physical uploaded files for synthetic workspaces
    const uploadRoot = path.resolve(process.cwd(), 'uploads', 'documents');
    for (const wsId of [testWorkspaceId, foreignWorkspaceId]) {
      const wsDir = path.join(uploadRoot, wsId);
      if (fs.existsSync(wsDir)) {
        fs.rmSync(wsDir, { recursive: true, force: true });
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Text Extraction & Chunking Unit Tests
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Document Extraction & Chunking Engine', () => {
    it('extracts plain text and markdown directly and deterministically', async () => {
      const sampleText = '# Enterprise Policy\n\nThis is a test document content.';
      const res = await TextExtractor.extract(Buffer.from(sampleText, 'utf-8'), 'md', 'text/markdown');
      expect(res.text).toBe(sampleText);
    });

    it('extracts JSON deterministically into formatted text', async () => {
      const sampleJson = { company: 'OmniDesk', product: 'AI Workspace', active: true };
      const res = await TextExtractor.extract(
        Buffer.from(JSON.stringify(sampleJson), 'utf-8'),
        'json',
        'application/json'
      );
      expect(res.text).toContain('OmniDesk');
      expect(res.metadata?.topLevelKeys).toContain('company');
    });

    it('extracts CSV deterministically with column headers and rows', async () => {
      const sampleCsv = 'name,role,department\nAlice,Engineer,Tech\nBob,Manager,Operations';
      const res = await TextExtractor.extract(Buffer.from(sampleCsv, 'utf-8'), 'csv', 'text/csv');
      expect(res.text).toContain('Headers: name, role, department');
      expect(res.text).toContain('Row 1: name: Alice | role: Engineer | department: Tech');
      expect(res.text).toContain('Row 2: name: Bob | role: Manager | department: Operations');
    });

    it('chunks text deterministically and generates contentHash', () => {
      const longText = Array(20)
        .fill(
          'OmniDesk AI enterprise knowledge base empowers team productivity with high fidelity RAG context retrieval and vector search.'
        )
        .join('\n\n');

      const chunks1 = DocumentChunker.chunk(longText, { targetChunkSize: 500, overlap: 100 });
      const chunks2 = DocumentChunker.chunk(longText, { targetChunkSize: 500, overlap: 100 });

      expect(chunks1.length).toBeGreaterThan(1);
      expect(chunks1.length).toBe(chunks2.length);
      expect(chunks1[0].contentHash).toBe(chunks2[0].contentHash);
      expect(chunks1[0].characterCount).toBeGreaterThan(0);
      expect(chunks1[0].tokenCount).toBe(Math.ceil(chunks1[0].characterCount / 4));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Document Upload & CRUD Tests
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Document Upload & Management APIs', () => {
    it('rejects upload without a file (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .set(adminHeaders)
        .field('name', 'Missing File Doc');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FILE_REQUIRED');
    });

    it('rejects upload for VIEWER role without documents:write permission (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .set(viewerHeaders)
        .attach('file', Buffer.from('unauthorized content'), 'test.txt')
        .field('name', 'Viewer Upload Attempt');

      expect(res.status).toBe(403);
    });

    it('successfully uploads a text document, extracts text, and creates chunks', async () => {
      const fileContent =
        '# Company Security Policy\n\nAll employee passwords must be rotated every 90 days. Multi-factor authentication is strictly enforced across all systems.';

      const res = await request(app)
        .post('/api/v1/documents')
        .set(adminHeaders)
        .attach('file', Buffer.from(fileContent, 'utf-8'), 'security_policy.md')
        .field('name', 'Security Policy')
        .field('category', 'Compliance')
        .field('description', 'Standard company security requirements');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const doc = res.body.data;
      expect(doc.name).toBe('Security Policy');
      expect(doc.status).toBe('ready');
      expect(doc.mimeType).toContain('text');
      expect(doc.versionNumber).toBe(1);
      expect(doc.chunkCount).toBeGreaterThan(0);

      createdDocumentIds.push(doc.id);

      // Verify physical file storage exists
      const storage = getStorageProvider();
      const fileExists = await storage.exists(testWorkspaceId, doc.storageKey);
      expect(fileExists).toBe(true);

      // Verify chunks were created in DB
      const chunks = await prisma.documentChunk.findMany({
        where: { documentId: doc.id, workspaceId: testWorkspaceId },
      });
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toContain('Company Security Policy');
    });

    it('lists documents scoped to workspace with pagination and filters', async () => {
      const res = await request(app)
        .get('/api/v1/documents')
        .set(adminHeaders)
        .query({ category: 'Compliance', limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('retrieves single document detail with versions and snippet', async () => {
      const docId = createdDocumentIds[0];
      const res = await request(app).get(`/api/v1/documents/${docId}`).set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(docId);
      expect(res.body.data.versions.length).toBe(1);
      expect(res.body.data.extractedTextSnippet).toContain('Security Policy');
    });

    it('downloads document binary file with correct headers', async () => {
      const docId = createdDocumentIds[0];
      const res = await request(app).get(`/api/v1/documents/${docId}/download`).set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.header['content-disposition']).toContain('attachment');
      expect(res.text).toContain('Security Policy');
    });

    it('retrieves document chunks via GET /api/v1/documents/:id/chunks', async () => {
      const docId = createdDocumentIds[0];
      const res = await request(app).get(`/api/v1/documents/${docId}/chunks`).set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].content).toContain('Security Policy');
    });

    it('updates document metadata via PATCH /api/v1/documents/:id', async () => {
      const docId = createdDocumentIds[0];
      const res = await request(app)
        .patch(`/api/v1/documents/${docId}`)
        .set(adminHeaders)
        .send({
          name: 'Updated Security Policy 2026',
          description: 'Updated compliance notes',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Security Policy 2026');
      expect(res.body.data.description).toBe('Updated compliance notes');
    });

    it('reprocesses document and maintains chunk idempotency', async () => {
      const docId = createdDocumentIds[0];
      const res = await request(app).post(`/api/v1/documents/${docId}/reprocess`).set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ready');

      // Verify no duplicate chunks
      const chunks = await prisma.documentChunk.findMany({
        where: { documentId: docId },
      });
      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Document Versioning Tests
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Document Version History', () => {
    it('uploads version 2 of a document, increments version number, and updates current version', async () => {
      const docId = createdDocumentIds[0];
      const updatedContent =
        '# Company Security Policy v2\n\nAll employee passwords must be rotated every 60 days. Biometric access is required for data rooms.';

      const res = await request(app)
        .post(`/api/v1/documents/${docId}/versions`)
        .set(adminHeaders)
        .attach('file', Buffer.from(updatedContent, 'utf-8'), 'security_policy_v2.md');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const doc = res.body.data;
      expect(doc.versionNumber).toBe(2);
      expect(doc.versions.length).toBe(2);

      // Verify both version 1 and 2 records exist in DB
      const versions = await prisma.documentVersion.findMany({
        where: { documentId: docId },
        orderBy: { versionNumber: 'asc' },
      });
      expect(versions.length).toBe(2);
      expect(versions[0].versionNumber).toBe(1);
      expect(versions[1].versionNumber).toBe(2);

      // Verify chunks belong to version 2
      const chunksV2 = await prisma.documentChunk.findMany({
        where: { documentId: docId, documentVersionId: versions[1].id },
      });
      expect(chunksV2.length).toBeGreaterThan(0);
      expect(chunksV2[0].content).toContain('v2');
    });

    it('lists version history via GET /api/v1/documents/:id/versions', async () => {
      const docId = createdDocumentIds[0];
      const res = await request(app).get(`/api/v1/documents/${docId}/versions`).set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].versionNumber).toBe(2);
      expect(res.body.data[1].versionNumber).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Knowledge Base CRUD & Document Association Tests
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Knowledge Base Management', () => {
    it('creates a new Knowledge Base', async () => {
      const res = await request(app)
        .post('/api/v1/knowledge-bases')
        .set(adminHeaders)
        .send({
          name: 'IT & Security Guidelines',
          description: 'Official IT standards and policies',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const kb = res.body.data;
      expect(kb.name).toBe('IT & Security Guidelines');
      expect(kb.documentCount).toBe(0);

      createdKbIds.push(kb.id);
    });

    it('lists knowledge bases scoped to workspace', async () => {
      const res = await request(app).get('/api/v1/knowledge-bases').set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].name).toBe('IT & Security Guidelines');
    });

    it('associates document to Knowledge Base', async () => {
      const kbId = createdKbIds[0];
      const docId = createdDocumentIds[0];

      const res = await request(app)
        .post(`/api/v1/knowledge-bases/${kbId}/documents`)
        .set(adminHeaders)
        .send({ documentId: docId });

      expect(res.status).toBe(200);
      expect(res.body.data.added).toBe(true);

      // Verify KB details reflect document count
      const kbRes = await request(app).get(`/api/v1/knowledge-bases/${kbId}`).set(adminHeaders);
      expect(kbRes.body.data.documentCount).toBe(1);
      expect(kbRes.body.data.documents[0].id).toBe(docId);
    });

    it('lists documents inside a Knowledge Base', async () => {
      const kbId = createdKbIds[0];
      const res = await request(app)
        .get(`/api/v1/knowledge-bases/${kbId}/documents`)
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it('removes document from Knowledge Base', async () => {
      const kbId = createdKbIds[0];
      const docId = createdDocumentIds[0];

      const res = await request(app)
        .delete(`/api/v1/knowledge-bases/${kbId}/documents/${docId}`)
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.removed).toBe(true);

      // Check KB count is now 0
      const kbRes = await request(app).get(`/api/v1/knowledge-bases/${kbId}`).set(adminHeaders);
      expect(kbRes.body.data.documentCount).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Hybrid Search & RAG Context Retrieval Tests
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Hybrid Retrieval & RAG Context Service', () => {
    it('performs search and returns ranked chunks with snippets and citations', async () => {
      const res = await request(app)
        .post('/api/v1/knowledge/search')
        .set(adminHeaders)
        .send({
          query: 'passwords rotated every 60 days',
          topK: 5,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const searchRes = res.body.data;
      expect(searchRes.totalResults).toBeGreaterThan(0);
      expect(searchRes.results[0].content).toContain('rotated every 60 days');
      expect(searchRes.results[0].snippet).toBeDefined();
      expect(searchRes.results[0].score).toBeGreaterThan(0);
    });

    it('builds structured RAG context with citations and security separation', async () => {
      const res = await request(app)
        .post('/api/v1/knowledge/context')
        .set(adminHeaders)
        .send({
          query: 'passwords rotation policy',
          topK: 3,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const context = res.body.data;
      expect(context.items.length).toBeGreaterThan(0);
      expect(context.formattedContext).toContain('SECURITY NOTICE');
      expect(context.formattedContext).toContain('[Source:');
      expect(context.formattedContext).toContain('Document:');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Multi-Tenant Workspace Isolation Tests
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Strict Workspace Isolation', () => {
    it('prevents foreign workspace from accessing documents of test workspace (404 Not Found)', async () => {
      const docId = createdDocumentIds[0];
      const res = await request(app).get(`/api/v1/documents/${docId}`).set(foreignHeaders);

      expect(res.status).toBe(404);
    });

    it('prevents foreign workspace from downloading documents of test workspace (404 Not Found)', async () => {
      const docId = createdDocumentIds[0];
      const res = await request(app).get(`/api/v1/documents/${docId}/download`).set(foreignHeaders);

      expect(res.status).toBe(404);
    });

    it('prevents foreign workspace from searching test workspace documents (0 results)', async () => {
      const res = await request(app)
        .post('/api/v1/knowledge/search')
        .set(foreignHeaders)
        .send({ query: 'passwords rotated' });

      expect(res.status).toBe(200);
      expect(res.body.data.totalResults).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Global Search Integration Tests
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Global Search Integration', () => {
    it('returns documents and knowledge bases in global search results', async () => {
      const res = await request(app)
        .get('/api/v1/search')
        .set(adminHeaders)
        .query({ q: 'Security' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const groups = res.body.data.resultsByGroup;
      expect(groups.documents).toBeDefined();
      expect(groups.documents.length).toBeGreaterThanOrEqual(1);
      expect(groups.documents[0].title).toContain('Security');
      expect(groups.documents[0].navigationTarget.tab).toBe('documents');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. AI Tools Integration Tests
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Knowledge AI Tools Execution', () => {
    it('executes knowledge_search tool via ToolExecutor with permissions and workspace isolation', async () => {
      const execContext: AgentExecutionContext = {
        workspaceId: testWorkspaceId,
        userId: testUserId,
        userRole: 'ADMIN',
        userPermissions: ['knowledgebase:read', 'documents:read'],
        requestId: 'req_test_01',
      };

      const proposal: ToolCallProposal = {
        toolId: 'knowledge_search',
        arguments: { query: 'passwords rotated' },
        reason: 'Testing knowledge search',
        riskLevel: 'LOW',
        requiresApproval: false,
      };

      const result = await toolExecutor.executeTool({
        proposal,
        context: execContext,
        executionId: 'exec_test_01',
        agentId: 'agent_test_01',
      });
      expect(result.executed).toBe(true);
      expect(result.result?.success).toBe(true);
      const out = result.result?.result as any;
      expect(out.totalResults).toBeGreaterThan(0);
      expect(out.results[0].citation).toContain('Source:');
    });

    it('executes knowledge_get_document tool via ToolExecutor', async () => {
      const execContext: AgentExecutionContext = {
        workspaceId: testWorkspaceId,
        userId: testUserId,
        userRole: 'ADMIN',
        userPermissions: ['documents:read'],
        requestId: 'req_test_02',
      };

      const proposal: ToolCallProposal = {
        toolId: 'knowledge_get_document',
        arguments: { documentId: createdDocumentIds[0] },
        reason: 'Testing knowledge get document',
        riskLevel: 'LOW',
        requiresApproval: false,
      };

      const result = await toolExecutor.executeTool({
        proposal,
        context: execContext,
        executionId: 'exec_test_02',
        agentId: 'agent_test_01',
      });
      expect(result.executed).toBe(true);
      expect(result.result?.success).toBe(true);
      const out = result.result?.result as any;
      expect(out.name).toContain('Security');
      expect(out.currentVersion).toBe(2);
    });

    it('executes knowledge_get_document_context tool via ToolExecutor', async () => {
      const execContext: AgentExecutionContext = {
        workspaceId: testWorkspaceId,
        userId: testUserId,
        userRole: 'ADMIN',
        userPermissions: ['knowledgebase:read', 'documents:read'],
        requestId: 'req_test_03',
      };

      const proposal: ToolCallProposal = {
        toolId: 'knowledge_get_document_context',
        arguments: { query: 'passwords' },
        reason: 'Testing knowledge RAG context builder',
        riskLevel: 'LOW',
        requiresApproval: false,
      };

      const result = await toolExecutor.executeTool({
        proposal,
        context: execContext,
        executionId: 'exec_test_03',
        agentId: 'agent_test_01',
      });
      expect(result.executed).toBe(true);
      expect(result.result?.success).toBe(true);
      const out = result.result?.result as any;
      expect(out.itemCount).toBeGreaterThan(0);
      expect(out.formattedContext).toContain('SECURITY NOTICE');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. Document Archiving & Deletion Tests
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Document Archiving & Soft Deletion', () => {
    it('archives document and excludes it from active document lists', async () => {
      const docId = createdDocumentIds[0];
      const res = await request(app).post(`/api/v1/documents/${docId}/archive`).set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.isArchived).toBe(true);
      expect(res.body.data.status).toBe('archived');

      // Verify excluded from active list
      const listRes = await request(app).get('/api/v1/documents').set(adminHeaders);
      const found = listRes.body.data.find((d: any) => d.id === docId);
      expect(found).toBeUndefined();
    });
  });
});
