import React, { useState, useEffect } from 'react';
import { X, UploadCloud, FileText, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import { DocumentDetail, KnowledgeBaseSummary } from '@omnidesk/shared-types';

interface UploadDocumentModalProps {
  onClose: () => void;
  onUploaded: (doc: DocumentDetail) => void;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  onClose,
  onUploaded,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [folderPath, setFolderPath] = useState('/');
  const [knowledgeBaseId, setKnowledgeBaseId] = useState('');
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseSummary[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .listKnowledgeBases()
      .then((res) => setKnowledgeBases(res.knowledgeBases))
      .catch(() => {});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    if (selected) {
      setFile(selected);
      if (!name) {
        setName(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a document file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (name.trim()) formData.append('name', name.trim());
      if (category.trim()) formData.append('category', category.trim());
      if (description.trim()) formData.append('description', description.trim());
      if (folderPath.trim()) formData.append('folderPath', folderPath.trim());
      if (knowledgeBaseId) formData.append('knowledgeBaseId', knowledgeBaseId);

      const doc = await apiClient.uploadDocument(formData);
      onUploaded(doc);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Document upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-backdrop animate-fade-in" style={{ zIndex: 1000 }}>
      <div className="modal-content" style={{ maxWidth: '540px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadCloud size={20} color="var(--brand-cyan)" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Upload Enterprise Document</h3>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* File Picker */}
          <div
            style={{
              border: '2px dashed var(--border-color)',
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: 'var(--bg-secondary)',
            }}
            onClick={() => document.getElementById('file-upload-input')?.click()}
          >
            <input
              type="file"
              id="file-upload-input"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept=".pdf,.docx,.txt,.md,.markdown,.csv,.json"
            />
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--brand-cyan)' }}>
                <FileText size={20} />
                <span style={{ fontWeight: 500, fontSize: '14px' }}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            ) : (
              <div>
                <UploadCloud size={32} color="var(--text-secondary)" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Click to select a file</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Supported: PDF, DOCX, TXT, MD, CSV, JSON (up to 50MB)</div>
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Document Name</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Employee Security Handbook 2026"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="General">General</option>
                <option value="Compliance">Compliance</option>
                <option value="Engineering">Engineering</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR</option>
                <option value="Operations">Operations</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Knowledge Base</label>
              <select className="input" value={knowledgeBaseId} onChange={(e) => setKnowledgeBaseId(e.target.value)}>
                <option value="">None (Standalone)</option>
                {knowledgeBases.map((kb) => (
                  <option key={kb.id} value={kb.id}>{kb.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Folder / Virtual Path</label>
            <input
              type="text"
              className="input"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="/Policies/Security"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Description (Optional)</label>
            <textarea
              className="input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the document contents"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" disabled={isUploading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isUploading || !file}>
              {isUploading ? 'Uploading & Processing...' : 'Upload & Process'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
