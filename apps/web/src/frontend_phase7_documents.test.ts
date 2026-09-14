import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './api/client';
import {
  DocumentSummary,
  DocumentDetail,
  DocumentChunkSummary,
  KnowledgeBaseSummary,
  KnowledgeSearchResponse,
  RAGContext,
} from '@omnidesk/shared-types';

describe('Frontend Phase 7: Enterprise Documents & Knowledge Base Client Logic', () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. DOCUMENTS LIST & FILTERING
  // ───────────────────────────────────────────────────────────────────────────
  it('apiClient.listDocuments fetches /documents with query filters', async () => {
    const mockDocs: DocumentSummary[] = [
      {
        id: 'doc-001',
        workspaceId: 'ws-test-1',
        name: 'Enterprise Security Policy',
        originalFileName: 'security_policy.pdf',
        mimeType: 'application/pdf',
        extension: 'pdf',
        sizeBytes: 1048576,
        storageProvider: 'local',
        status: 'ready',
        category: 'Compliance',
        folderPath: '/Policies',
        isArchived: false,
        versionNumber: 2,
        chunkCount: 8,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-02T00:00:00.000Z',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockDocs,
        meta: { total: 1, page: 1, perPage: 20, totalPages: 1 },
      }),
    });

    const res = await apiClient.listDocuments({ category: 'Compliance', status: 'ready' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/documents?category=Compliance&status=ready'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-workspace-id': expect.any(String),
        }),
      })
    );
    expect(res.documents.length).toBe(1);
    expect(res.documents[0].name).toBe('Enterprise Security Policy');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. DOCUMENT UPLOAD VIA FORMDATA
  // ───────────────────────────────────────────────────────────────────────────
  it('apiClient.uploadDocument sends multipart FormData without hardcoded Content-Type', async () => {
    const mockDetail: DocumentDetail = {
      id: 'doc-002',
      workspaceId: 'ws-test-1',
      name: 'Architecture Roadmap',
      originalFileName: 'roadmap.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extension: 'docx',
      sizeBytes: 524288,
      storageProvider: 'local',
      storageKey: 'v1_key_roadmap.docx',
      checksum: 'abc123hash',
      status: 'ready',
      category: 'Engineering',
      folderPath: '/Tech',
      isArchived: false,
      versionNumber: 1,
      chunkCount: 4,
      versions: [],
      knowledgeBases: [],
      createdAt: '2026-09-03T00:00:00.000Z',
      updatedAt: '2026-09-03T00:00:00.000Z',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ success: true, data: mockDetail }),
    });

    const formData = new FormData();
    formData.append('name', 'Architecture Roadmap');

    const res = await apiClient.uploadDocument(formData);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/documents'),
      expect.objectContaining({
        method: 'POST',
        body: formData,
      })
    );
    expect(res.id).toBe('doc-002');
    expect(res.name).toBe('Architecture Roadmap');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. DOCUMENT DETAIL & CHUNKS
  // ───────────────────────────────────────────────────────────────────────────
  it('apiClient.getDocument fetches document detail by ID', async () => {
    const mockDetail: DocumentDetail = {
      id: 'doc-003',
      workspaceId: 'ws-test-1',
      name: 'Employee Handbook',
      originalFileName: 'handbook.md',
      mimeType: 'text/markdown',
      extension: 'md',
      sizeBytes: 12000,
      storageProvider: 'local',
      storageKey: 'v1_key_handbook.md',
      checksum: 'hash123',
      status: 'ready',
      isArchived: false,
      versionNumber: 1,
      chunkCount: 2,
      extractedTextSnippet: '# Employee Handbook\nWelcome to OmniDesk.',
      versions: [],
      knowledgeBases: [{ id: 'kb-1', name: 'HR Policies' }],
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockDetail }),
    });

    const res = await apiClient.getDocument('doc-003');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/documents/doc-003'),
      expect.anything()
    );
    expect(res.name).toBe('Employee Handbook');
    expect(res.knowledgeBases.length).toBe(1);
    expect(res.knowledgeBases[0].name).toBe('HR Policies');
  });

  it('apiClient.getDocumentChunks fetches chunks for a document', async () => {
    const mockChunks: DocumentChunkSummary[] = [
      {
        id: 'chunk-1',
        workspaceId: 'ws-test-1',
        documentId: 'doc-003',
        chunkIndex: 0,
        content: 'Welcome to OmniDesk enterprise workspace.',
        tokenCount: 8,
        characterCount: 42,
        contentHash: 'chunkhash1',
        hasEmbedding: true,
        createdAt: '2026-09-01T00:00:00.000Z',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockChunks }),
    });

    const res = await apiClient.getDocumentChunks('doc-003');
    expect(res.length).toBe(1);
    expect(res[0].content).toContain('OmniDesk');
  });

  it('apiClient.getDocumentDownloadUrl constructs valid download URL with optional version', () => {
    const urlV1 = apiClient.getDocumentDownloadUrl('doc-100');
    expect(urlV1).toContain('/documents/doc-100/download');

    const urlV2 = apiClient.getDocumentDownloadUrl('doc-100', 2);
    expect(urlV2).toContain('/documents/doc-100/download?version=2');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. KNOWLEDGE BASES
  // ───────────────────────────────────────────────────────────────────────────
  it('apiClient.listKnowledgeBases fetches collections list', async () => {
    const mockKBs: KnowledgeBaseSummary[] = [
      {
        id: 'kb-100',
        workspaceId: 'ws-test-1',
        name: 'Company Policies',
        description: 'Standard enterprise operating procedures',
        status: 'active',
        isArchived: false,
        documentCount: 5,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-02T00:00:00.000Z',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockKBs }),
    });

    const res = await apiClient.listKnowledgeBases();
    expect(res.knowledgeBases.length).toBe(1);
    expect(res.knowledgeBases[0].name).toBe('Company Policies');
    expect(res.knowledgeBases[0].documentCount).toBe(5);
  });

  it('apiClient.createKnowledgeBase creates a new KB collection', async () => {
    const newKb: KnowledgeBaseSummary = {
      id: 'kb-200',
      workspaceId: 'ws-test-1',
      name: 'Engineering Docs',
      description: 'Technical standards and RFCs',
      status: 'active',
      isArchived: false,
      documentCount: 0,
      createdAt: '2026-09-04T00:00:00.000Z',
      updatedAt: '2026-09-04T00:00:00.000Z',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ success: true, data: newKb }),
    });

    const res = await apiClient.createKnowledgeBase({
      name: 'Engineering Docs',
      description: 'Technical standards and RFCs',
    });

    expect(res.id).toBe('kb-200');
    expect(res.name).toBe('Engineering Docs');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. HYBRID SEARCH & RAG CONTEXT
  // ───────────────────────────────────────────────────────────────────────────
  it('apiClient.searchKnowledge performs hybrid search and returns citations', async () => {
    const mockSearchRes: KnowledgeSearchResponse = {
      query: 'passwords rotation policy',
      totalResults: 1,
      searchMode: 'hybrid',
      embeddingAvailable: true,
      results: [
        {
          chunkId: 'ch-01',
          documentId: 'doc-001',
          documentName: 'Enterprise Security Policy',
          versionNumber: 2,
          chunkIndex: 0,
          content: 'All employee passwords must be rotated every 60 days.',
          snippet: 'All employee passwords must be rotated...',
          score: 0.895,
          searchMode: 'hybrid',
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockSearchRes }),
    });

    const res = await apiClient.searchKnowledge('passwords rotation policy', { mode: 'hybrid' });

    expect(res.totalResults).toBe(1);
    expect(res.results[0].documentName).toBe('Enterprise Security Policy');
    expect(res.results[0].score).toBe(0.895);
  });

  it('apiClient.getKnowledgeContext retrieves structured RAG context', async () => {
    const mockContext: RAGContext = {
      query: 'password rotation',
      workspaceId: 'ws-test-1',
      items: [
        {
          documentId: 'doc-001',
          documentName: 'Enterprise Security Policy',
          chunkId: 'ch-01',
          content: 'Passwords must be rotated every 60 days.',
          score: 0.95,
          citation: '[Source: "Enterprise Security Policy" (v2), Chunk 0]',
        },
      ],
      formattedContext: '=== DOCUMENT CONTEXT ITEM [1] ===\n[Source: "Enterprise Security Policy" (v2), Chunk 0]\n"""\nPasswords must be rotated every 60 days.\n"""',
      retrievedAt: '2026-09-04T12:00:00.000Z',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockContext }),
    });

    const res = await apiClient.getKnowledgeContext('password rotation');

    expect(res.items.length).toBe(1);
    expect(res.formattedContext).toContain('Security Policy');
    expect(res.items[0].citation).toContain('Source:');
  });
});
