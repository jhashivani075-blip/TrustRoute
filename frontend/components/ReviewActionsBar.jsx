'use client';

import React, { useState } from 'react';
import { Check, HelpCircle, Split, CheckCircle2, History } from 'lucide-react';

export default function ReviewActionsBar({ incidentId, status, audits = [], onAction }) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTriggerAction = (actionType) => {
    setIsSubmitting(true);
    onAction(incidentId, actionType, notes);
    setNotes('');
    setIsSubmitting(false);
  };

  const relevantAudits = audits.filter((a) => a.incident_id === incidentId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="review-action-bar">
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
            Human Decision & Triage Notes
          </div>
          <input
            type="text"
            className="form-input"
            placeholder="Add reviewer notes (e.g. Dispatched rescue boat unit 3, verified with ward officer)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="action-buttons-group">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleTriggerAction('NEEDS_VERIFICATION')}
            disabled={isSubmitting}
          >
            <HelpCircle size={15} color="var(--accent-amber)" />
            <span>Request Verification</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleTriggerAction('SPLIT')}
            disabled={isSubmitting}
          >
            <Split size={15} color="var(--accent-blue)" />
            <span>Split / Unlink Cluster</span>
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleTriggerAction('CONFIRM')}
            disabled={isSubmitting}
          >
            <Check size={15} />
            <span>Confirm & Triage</span>
          </button>

          <button
            className="btn btn-danger btn-sm"
            onClick={() => handleTriggerAction('RESOLVE')}
            disabled={isSubmitting}
          >
            <CheckCircle2 size={15} />
            <span>Resolve Incident</span>
          </button>
        </div>
      </div>

      {/* Audit Trail Log */}
      <div className="audit-log-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
          <History size={18} color="var(--accent-blue)" />
          <span>Incident Audit Trail (Human-in-the-Loop Log)</span>
        </div>

        {relevantAudits.length > 0 ? (
          <div>
            {relevantAudits.map((aud) => (
              <div key={aud.id} className="audit-item">
                <div className="audit-meta">
                  <span className="badge badge-hazard" style={{ fontSize: '0.65rem' }}>{aud.action}</span>
                  <strong>{aud.reviewer}</strong>
                  <span>•</span>
                  <span>{new Date(aud.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                  {aud.notes}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            No coordinator reviews recorded yet. Incident is pending initial triage.
          </p>
        )}
      </div>
    </div>
  );
}
