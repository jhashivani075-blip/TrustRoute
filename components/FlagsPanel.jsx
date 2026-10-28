'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, X, ShieldAlert } from 'lucide-react';

export default function FlagsPanel({ flags = [], onDismissFlag }) {
  const [selectedFlagForDismiss, setSelectedFlagForDismiss] = useState(null);
  const [dismissReason, setDismissReason] = useState('');

  const handleOpenDismiss = (flag) => {
    setSelectedFlagForDismiss(flag);
    setDismissReason('');
  };

  const handleConfirmDismiss = () => {
    if (!dismissReason.trim() || !selectedFlagForDismiss) return;
    onDismissFlag(selectedFlagForDismiss.id, dismissReason.trim());
    setSelectedFlagForDismiss(null);
  };

  if (!flags || flags.length === 0) {
    return (
      <div className="card" style={{ padding: '20px', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} color="var(--accent-green)" />
          <span>No active evidence flags detected. Cluster data is coherent.</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {flags.map((f) => {
        const isDismissed = f.state === 'DISMISSED';
        const isConflict = f.code.includes('CONFLICT');

        return (
          <div
            key={f.id}
            className={`flag-card ${isConflict ? 'conflict' : ''} ${isDismissed ? 'dismissed' : ''}`}
          >
            <div className="flag-title-row">
              <div className="flag-title">
                <AlertTriangle size={18} color={isConflict ? 'var(--accent-red)' : 'var(--accent-amber)'} />
                <span>{f.title}</span>
                <span className="badge" style={{ fontSize: '0.65rem' }}>
                  {f.code}
                </span>
              </div>
              <div>
                {isDismissed ? (
                  <span className="badge" style={{ background: 'var(--bg-input)', color: 'var(--text-dim)' }}>
                    DISMISSED
                  </span>
                ) : (
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    onClick={() => handleOpenDismiss(f)}
                  >
                    Dismiss with Reason
                  </button>
                )}
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
              {f.message}
            </p>

            {f.evidence && f.evidence.length > 0 && (
              <div className="flag-evidence-box">
                <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                  EVIDENCE SNIPPETS:
                </strong>
                <ul style={{ paddingLeft: '18px', margin: 0 }}>
                  {f.evidence.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </div>
            )}

            {isDismissed && f.dismissed_reason && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: '4px' }}>
                <strong>Dismissal Reason by {f.dismissed_by || 'Coordinator'}:</strong> {f.dismissed_reason}
              </div>
            )}
          </div>
        );
      })}

      {/* Dismiss with Reason Modal */}
      {selectedFlagForDismiss && (
        <div className="modal-overlay" onClick={() => setSelectedFlagForDismiss(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} color="var(--accent-amber)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Dismiss Evidence Flag
                </h3>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedFlagForDismiss(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Flag: <strong>{selectedFlagForDismiss.title}</strong>
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Every dismissal is audited. Provide a justification (e.g. verified on phone with ground team, duplicate reported by mistake, etc.):
              </p>

              <div className="form-group">
                <label className="form-label">Mandatory Dismissal Reason</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="e.g., Station Road Market is verified adjacent to Ward 12 dyke by field volunteer."
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedFlagForDismiss(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm"
                disabled={!dismissReason.trim()}
                onClick={handleConfirmDismiss}
              >
                Confirm Dismissal & Rescore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
