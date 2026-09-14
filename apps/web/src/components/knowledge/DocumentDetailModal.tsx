import React, { useState } from 'react';
import {
  X,
  FileText,
  Download,
  RotateCw,
  Archive,
  AlertCircle,
  CheckCircle2,
  Clock,
  UploadCloud,
} from 'lucide-react';
import { DocumentDetail } from '@omnidesk/shared-types';
import { apiClient } from '../../api/client';

interface DocumentDetailModalProps {
  document: DocumentDetail;
  onClose: () => void;
  onDocumentUpdated: (doc: DocumentDetail) => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  onClose,
  onDocumentUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'text' | 'versions' | 'chunks'>('overview');
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [chunks, setChunks] = useState<any[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleReprocess = async () => {
    setIsReprocessing(true);
    setErrorMessage(null);
    try {
      const updated = await apiClient.reprocessDocument(document.id);
      onDocumentUpdated(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Reprocessing failed');
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm(`Are you sure you want to archive "${document.name}"?`)) return;
    try {
      const updated = await apiClient.archiveDocument(document.id);
      onDocumentUpdated(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Archiving failed');
    }
  };

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionFile) return;

    setIsUploadingVersion(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', newVersionFile);
      const updated = await apiClient.createDocumentVersion(document.id, formData);
      onDocumentUpdated(updated);
      setNewVersionFile(null);
      setActiveTab('versions');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload new version');
    } finally {
      setIsUploadingVersion(false);
    }
  };

  const loadChunks = async () => {
    setIsLoadingChunks(true);
    try {
      const result = await apiClient.getDocumentChunks(document.id);
      setChunks(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load chunks');
    } finally {
      setIsLoadingChunks(false);
    }
  };

  const statusBadge = () => {
    switch (document.status) {
      case 'ready':
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} /> Ready
          </span>
        );
      case 'processing':
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={13} className="spin" /> Processing
          </span>
        );
      case 'failed':
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={13} /> Failed
          </span>
        );
      case 'archived':
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Archive size={13} /> Archived
          </span>
        );
      default:
        return <span className="badge">{document.status}</span>;
    }
  };

  return (
    <div className="modal-backdrop animate-fade-in" style={{ zIndex: 1000 }}>
      <div className="modal-content" style={{ maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(6, 182, 212, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-cyan)',
              }}
            >
              <FileText size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {document.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>{document.originalFileName}</span>
                <span>•</span>
                <span>{(document.sizeBytes / 1024).toFixed(1)} KB</span>
                <span>•</span>
                {statusBadge()}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', padding: '12px 0' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '13px',
              borderBottom: activeTab === 'overview' ? '2px solid var(--brand-cyan)' : 'none',
              color: activeTab === 'overview' ? 'var(--brand-cyan)' : 'var(--text-secondary)',
            }}
          >
            Overview & Metadata
          </button>
          <button
            onClick={() => setActiveTab('text')}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '13px',
              borderBottom: activeTab === 'text' ? '2px solid var(--brand-cyan)' : 'none',
              color: activeTab === 'text' ? 'var(--brand-cyan)' : 'var(--text-secondary)',
            }}
          >
            Extracted Text
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '13px',
              borderBottom: activeTab === 'versions' ? '2px solid var(--brand-cyan)' : 'none',
              color: activeTab === 'versions' ? 'var(--brand-cyan)' : 'var(--text-secondary)',
            }}
          >
            Version History ({document.versions?.length || 1})
          </button>
          <button
            onClick={() => {
              setActiveTab('chunks');
              if (chunks.length === 0) loadChunks();
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '13px',
              borderBottom: activeTab === 'chunks' ? '2px solid var(--brand-cyan)' : 'none',
              color: activeTab === 'chunks' ? 'var(--brand-cyan)' : 'var(--text-secondary)',
            }}
          >
            RAG Chunks ({document.chunkCount || 0})
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div style={{ margin: '12px 0', padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            {errorMessage}
          </div>
        )}

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="card" style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0', textTransform: 'uppercase' }}>File Details</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Format / MIME:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{document.extension.toUpperCase()} ({document.mimeType})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>File Size:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{(document.sizeBytes / 1024).toFixed(1)} KB</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Category:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{document.category || 'General'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Folder Path:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{document.folderPath || '/'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Storage Provider:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{document.storageProvider}</span>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0', textTransform: 'uppercase' }}>Integrity & Security</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>SHA-256 Checksum:</span>
                    <span style={{ color: 'var(--text-primary)', fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all' }}>{document.checksum}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Current Version:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>v{document.versionNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Uploaded:</span>
                    <span style={{ color: 'var(--text-primary)' }}>{new Date(document.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Knowledge Bases:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {document.knowledgeBases?.length ? document.knowledgeBases.map((k) => k.name).join(', ') : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {document.description && (
                <div style={{ gridColumn: 'span 2', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Description</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{document.description}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'text' && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
              <pre style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: 1.6 }}>
                {document.extractedTextSnippet || 'No extracted text available.'}
              </pre>
            </div>
          )}

          {activeTab === 'versions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Upload new version form */}
              <form onSubmit={handleUploadVersion} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <input
                  type="file"
                  id="version-file-input"
                  onChange={(e) => setNewVersionFile(e.target.files?.[0] || null)}
                  style={{ fontSize: '13px', color: 'var(--text-secondary)' }}
                />
                <button
                  type="submit"
                  disabled={!newVersionFile || isUploadingVersion}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 14px' }}
                >
                  <UploadCloud size={14} />
                  {isUploadingVersion ? 'Uploading...' : 'Upload New Version'}
                </button>
              </form>

              {/* Version list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {document.versions?.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>Version {v.versionNumber}</span>
                        {v.versionNumber === document.versionNumber && (
                          <span className="badge" style={{ backgroundColor: 'rgba(6, 182, 212, 0.2)', color: 'var(--brand-cyan)', fontSize: '11px' }}>Current</span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        <span>{(v.sizeBytes / 1024).toFixed(1)} KB</span> • <span>{new Date(v.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <a
                      href={apiClient.getDocumentDownloadUrl(document.id, v.versionNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                    >
                      <Download size={13} /> Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'chunks' && (
            <div>
              {isLoadingChunks ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>Loading chunks...</div>
              ) : chunks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No chunks available.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {chunks.map((c) => (
                    <div key={c.id} style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '3px solid var(--brand-cyan)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        <span>Chunk #{c.chunkIndex + 1}</span>
                        <span>{c.tokenCount} tokens • {c.characterCount} chars</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {c.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleReprocess}
              disabled={isReprocessing}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <RotateCw size={14} className={isReprocessing ? 'spin' : ''} />
              {isReprocessing ? 'Reprocessing...' : 'Reprocess'}
            </button>
            <button
              onClick={handleArchive}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#ef4444' }}
            >
              <Archive size={14} /> Archive
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href={apiClient.getDocumentDownloadUrl(document.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', textDecoration: 'none' }}
            >
              <Download size={14} /> Download Document
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
