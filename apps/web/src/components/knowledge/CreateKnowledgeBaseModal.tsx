import React, { useState } from 'react';
import { X, BookOpen, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import { KnowledgeBaseSummary } from '@omnidesk/shared-types';

interface CreateKnowledgeBaseModalProps {
  onClose: () => void;
  onCreated: (kb: KnowledgeBaseSummary) => void;
}

export const CreateKnowledgeBaseModal: React.FC<CreateKnowledgeBaseModalProps> = ({
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Knowledge Base name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const kb = await apiClient.createKnowledgeBase({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onCreated(kb);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create knowledge base');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop animate-fade-in" style={{ zIndex: 1000 }}>
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} color="var(--brand-cyan)" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Create Knowledge Base</h3>
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
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Knowledge Base Name</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Company Policies, Technical Documentation"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Description</label>
            <textarea
              className="input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the scope and purpose of this knowledge base"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Knowledge Base'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
