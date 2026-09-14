import React, { useState, useEffect } from 'react';
import {
  FileText,
  BookOpen,
  Search,
  UploadCloud,
  Plus,
  Download,
  RotateCw,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Trash2,
} from 'lucide-react';
import {
  DocumentSummary,
  DocumentDetail,
  KnowledgeBaseSummary,
  KnowledgeBaseDetail,
  KnowledgeSearchResult,
  RAGContext,
} from '@omnidesk/shared-types';
import { apiClient } from '../../api/client';
import { DocumentDetailModal } from './DocumentDetailModal';
import { UploadDocumentModal } from './UploadDocumentModal';
import { CreateKnowledgeBaseModal } from './CreateKnowledgeBaseModal';

export const KnowledgePortalView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'documents' | 'knowledge_bases' | 'search'>('documents');
  
  // Documents state
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [docSearch, setDocSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentDetail | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Knowledge Bases state
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseSummary[]>([]);
  const [selectedKB, setSelectedKB] = useState<KnowledgeBaseDetail | null>(null);
  const [isCreateKBOpen, setIsCreateKBOpen] = useState(false);
  const [isLoadingKBs, setIsLoadingKBs] = useState(false);

  // RAG Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'hybrid' | 'keyword' | 'semantic'>('hybrid');
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[]>([]);
  const [ragContext, setRagContext] = useState<RAGContext | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Load documents
  const loadDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const res = await apiClient.listDocuments({
        search: docSearch || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        limit: 50,
      });
      setDocuments(res.documents);
      setTotalDocs(res.total);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  // Load knowledge bases
  const loadKnowledgeBases = async () => {
    setIsLoadingKBs(true);
    try {
      const res = await apiClient.listKnowledgeBases();
      setKnowledgeBases(res.knowledgeBases);
    } catch (err) {
      console.error('Failed to load knowledge bases:', err);
    } finally {
      setIsLoadingKBs(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    loadKnowledgeBases();
  }, [docSearch, categoryFilter, statusFilter]);

  const handleOpenDocDetail = async (docId: string) => {
    try {
      const detail = await apiClient.getDocument(docId);
      setSelectedDoc(detail);
    } catch (err) {
      console.error('Failed to get document detail:', err);
    }
  };

  const handleOpenKB = async (kbId: string) => {
    try {
      const detail = await apiClient.getKnowledgeBase(kbId);
      setSelectedKB(detail);
    } catch (err) {
      console.error('Failed to get KB detail:', err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setRagContext(null);

    try {
      const res = await apiClient.searchKnowledge(searchQuery.trim(), {
        mode: searchMode,
        topK: 10,
      });
      setSearchResults(res.results);

      // Also generate RAG context
      const ctx = await apiClient.getKnowledgeContext(searchQuery.trim(), { topK: 5 });
      setRagContext(ctx);
    } catch (err: any) {
      setSearchError(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Metrics
  const readyDocCount = documents.filter((d) => d.status === 'ready').length;
  const totalChunks = documents.reduce((sum, d) => sum + (d.chunkCount || 0), 0);

  return (
    <div className="view-container animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="card" style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Documents</span>
            <FileText size={18} color="var(--brand-cyan)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{totalDocs}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Across enterprise workspace</div>
        </div>

        <div className="card" style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Ready / Indexed</span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{readyDocCount}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Extracted & retrieval-ready</div>
        </div>

        <div className="card" style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Knowledge Collections</span>
            <BookOpen size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{knowledgeBases.length}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Topic & domain clusters</div>
        </div>

        <div className="card" style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>RAG Chunks</span>
            <Layers size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{totalChunks}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Deterministic indexed passages</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { setActiveTab('documents'); setSelectedKB(null); }}
            className={`btn ${activeTab === 'documents' && !selectedKB ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <FileText size={15} /> Documents
          </button>
          <button
            onClick={() => { setActiveTab('knowledge_bases'); setSelectedKB(null); }}
            className={`btn ${activeTab === 'knowledge_bases' || selectedKB ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <BookOpen size={15} /> Knowledge Bases
          </button>
          <button
            onClick={() => { setActiveTab('search'); setSelectedKB(null); }}
            className={`btn ${activeTab === 'search' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Sparkles size={15} /> RAG Semantic Search
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'documents' && (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <UploadCloud size={15} /> Upload Document
            </button>
          )}
          {activeTab === 'knowledge_bases' && (
            <button
              onClick={() => setIsCreateKBOpen(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <Plus size={15} /> New Knowledge Base
            </button>
          )}
        </div>
      </div>

      {/* ── DOCUMENTS TAB ────────────────────────────────────────────────────────── */}
      {activeTab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: '36px' }}
                placeholder="Search documents by name, filename, or description..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
              />
            </div>
            <select className="input" style={{ width: '160px' }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              <option value="General">General</option>
              <option value="Compliance">Compliance</option>
              <option value="Engineering">Engineering</option>
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
            </select>
            <select className="input" style={{ width: '140px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="archived">Archived</option>
            </select>
            <button onClick={loadDocuments} className="btn btn-outline" style={{ padding: '8px 12px' }}>
              <RotateCw size={14} className={isLoadingDocs ? 'spin' : ''} />
            </button>
          </div>

          {/* Documents Table */}
          <div className="card" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 16px' }}>Document Name</th>
                  <th style={{ padding: '12px 16px' }}>Format</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Size</th>
                  <th style={{ padding: '12px 16px' }}>Version</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Updated</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingDocs && documents.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Loading enterprise documents...
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No documents found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr
                      key={doc.id}
                      style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => handleOpenDocDetail(doc.id)}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={16} color="var(--brand-cyan)" />
                          <span>{doc.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge" style={{ fontSize: '11px', textTransform: 'uppercase' }}>{doc.extension}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{doc.category || 'General'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{(doc.sizeBytes / 1024).toFixed(1)} KB</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>v{doc.versionNumber || 1}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {doc.status === 'ready' && (
                          <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>Ready</span>
                        )}
                        {doc.status === 'processing' && (
                          <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>Processing</span>
                        )}
                        {doc.status === 'failed' && (
                          <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>Failed</span>
                        )}
                        {doc.status === 'archived' && (
                          <span className="badge" style={{ backgroundColor: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af' }}>Archived</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <a
                          href={apiClient.getDocumentDownloadUrl(doc.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-icon"
                          title="Download"
                          style={{ color: 'var(--text-secondary)', marginRight: '8px' }}
                        >
                          <Download size={15} />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── KNOWLEDGE BASES TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'knowledge_bases' && !selectedKB && (
        isLoadingKBs && knowledgeBases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
            Loading knowledge bases...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {knowledgeBases.map((kb) => (
            <div
              key={kb.id}
              className="card"
              style={{
                padding: '20px',
                borderRadius: '12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
              onClick={() => handleOpenKB(kb.id)}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={18} color="var(--brand-cyan)" />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{kb.name}</h3>
                  </div>
                  <span className="badge" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: 'var(--brand-cyan)' }}>
                    {kb.documentCount} Docs
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                  {kb.description || 'No description provided.'}
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <span>Updated {new Date(kb.updatedAt).toLocaleDateString()}</span>
                <span style={{ color: 'var(--brand-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Explore <ExternalLink size={12} />
                </span>
              </div>
            </div>
          ))}
        </div>
        )
      )}

      {/* KB DETAIL VIEW */}
      {selectedKB && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
            <div>
              <button
                onClick={() => setSelectedKB(null)}
                style={{ background: 'none', border: 'none', color: 'var(--brand-cyan)', cursor: 'pointer', fontSize: '12px', marginBottom: '4px' }}
              >
                ← Back to all Knowledge Bases
              </button>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedKB.name}</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedKB.description}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="badge" style={{ fontSize: '13px', padding: '6px 12px' }}>{selectedKB.documentCount} Linked Documents</span>
            </div>
          </div>

          <div className="card" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 16px' }}>Document Name</th>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px' }}>Size</th>
                  <th style={{ padding: '12px 16px' }}>Version</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedKB.documents.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No documents currently assigned to this knowledge base.
                    </td>
                  </tr>
                ) : (
                  selectedKB.documents.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={16} color="var(--brand-cyan)" />
                          <span>{doc.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}><span className="badge">{doc.extension}</span></td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{(doc.sizeBytes / 1024).toFixed(1)} KB</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>v{doc.versionNumber || 1}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={async () => {
                            await apiClient.removeDocumentFromKnowledgeBase(selectedKB.id, doc.id);
                            handleOpenKB(selectedKB.id);
                          }}
                          className="btn-icon"
                          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                          title="Remove from KB"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── RAG SEMANTIC SEARCH TAB ────────────────────────────────────────────── */}
      {activeTab === 'search' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Query Box */}
          <form onSubmit={handleSearch} style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--brand-cyan)' }} />
                <input
                  type="text"
                  className="input"
                  style={{ paddingLeft: '42px', fontSize: '15px', height: '44px' }}
                  placeholder="Ask a question or enter keywords across all enterprise documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ height: '44px', padding: '0 24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }} disabled={isSearching}>
                <Sparkles size={16} />
                {isSearching ? 'Retrieving...' : 'Search Knowledge'}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>Retrieval Engine Mode:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="searchMode"
                  value="hybrid"
                  checked={searchMode === 'hybrid'}
                  onChange={() => setSearchMode('hybrid')}
                />
                Hybrid (RRF Keyword + Semantic)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="searchMode"
                  value="keyword"
                  checked={searchMode === 'keyword'}
                  onChange={() => setSearchMode('keyword')}
                />
                Keyword Only
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="searchMode"
                  value="semantic"
                  checked={searchMode === 'semantic'}
                  onChange={() => setSearchMode('semantic')}
                />
                Semantic (Vector)
              </label>
            </div>
          </form>

          {searchError && (
            <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              {searchError}
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Ranked Retrieval Results ({searchResults.length} matches)
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {searchResults.map((result) => (
                  <div
                    key={result.chunkId}
                    className="card"
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      background: 'var(--bg-secondary)',
                      borderLeft: '4px solid var(--brand-cyan)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} color="var(--brand-cyan)" />
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{result.documentName}</span>
                        <span className="badge" style={{ fontSize: '11px' }}>v{result.versionNumber}</span>
                        <span className="badge" style={{ fontSize: '11px' }}>Chunk #{result.chunkIndex + 1}</span>
                      </div>
                      <span className="badge" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: 'var(--brand-cyan)', fontSize: '12px' }}>
                        Score: {result.score}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {result.content}
                    </p>

                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={12} />
                      <span>Source Citation: [Source: "{result.documentName}" (v{result.versionNumber}), Chunk {result.chunkIndex}]</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* RAG Context Output Box */}
              {ragContext && (
                <div style={{ marginTop: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Sparkles size={18} color="var(--brand-cyan)" />
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Assembled RAG Agent Context (Verified Citations)
                    </h4>
                  </div>
                  <pre style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary)', background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', whiteSpace: 'pre-wrap', maxHeight: '250px', overflowY: 'auto' }}>
                    {ragContext.formattedContext}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {selectedDoc && (
        <DocumentDetailModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onDocumentUpdated={(updated) => {
            setSelectedDoc(updated);
            loadDocuments();
          }}
        />
      )}

      {isUploadOpen && (
        <UploadDocumentModal
          onClose={() => setIsUploadOpen(false)}
          onUploaded={() => {
            loadDocuments();
          }}
        />
      )}

      {isCreateKBOpen && (
        <CreateKnowledgeBaseModal
          onClose={() => setIsCreateKBOpen(false)}
          onCreated={() => {
            loadKnowledgeBases();
          }}
        />
      )}
    </div>
  );
};
