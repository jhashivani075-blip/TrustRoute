'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle, AlertTriangle, Layers, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

export default function SubmissionFeedbackCard({ result, onReset }) {
  if (!result) return null;

  const {
    incident,
    is_new_incident,
    priority_score,
    priority_level,
    flags = [],
    freshness,
    explanation,
  } = result;

  const isHigh = priority_level === 'HIGH';
  const isMedium = priority_level === 'MEDIUM';
  const badgeClass = isHigh ? 'badge-high' : isMedium ? 'badge-medium' : 'badge-low';

  return (
    <div className="feedback-card">
      <div className="feedback-header">
        <div className="feedback-title-group">
          <div className="feedback-icon">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Report Ingested & Evaluated
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
              Simulation & Verification Engine
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge" style={{ background: 'var(--bg-input)', color: 'var(--text-dim)' }}>
            STATUS: {incident.status || 'PENDING'}
          </span>
          <span className={`badge ${badgeClass}`}>
            PRIORITY: {priority_level} ({priority_score}/100)
          </span>
        </div>
      </div>

      <div className="feedback-details-grid">
        {/* Item 1: Cluster Assignment */}
        <div className="feedback-item">
          <div className="feedback-item-label">Clustering Decision</div>
          <div className="feedback-item-value" style={{ color: is_new_incident ? 'var(--accent-cyan)' : 'var(--accent-green)' }}>
            {is_new_incident ? 'New Incident Cluster Created' : `Merged with ${incident.id}`}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Cluster ID: <strong>{incident.id}</strong> ({incident.report_count} reports total)
          </div>
        </div>

        {/* Item 2: Freshness Status */}
        <div className="feedback-item">
          <div className="feedback-item-label">Freshness Classification</div>
          <div className="feedback-item-value">
            <span className={`badge ${freshness === 'FRESH' ? 'badge-fresh' : 'badge-aging'}`}>
              {freshness}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Hazard: {incident.hazard_type}
          </div>
        </div>

        {/* Item 3: Detected Flags */}
        <div className="feedback-item">
          <div className="feedback-item-label">Detected Review Flags</div>
          <div className="feedback-item-value" style={{ fontSize: '0.9rem' }}>
            {flags.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {flags.map((f, i) => (
                  <span key={i} className="flag-pill conflict">
                    <AlertTriangle size={11} />
                    {f.code}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ color: 'var(--accent-green)', fontSize: '0.85rem' }}>
                No conflicting flags
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Explanation Box */}
      <div className="feedback-explanation">
        <strong>Scoring & Routing Explanation:</strong> {explanation}
      </div>

      <div className="feedback-actions">
        <button className="btn btn-secondary btn-sm" onClick={onReset}>
          <RefreshCw size={14} />
          Submit Another Report
        </button>

        <Link href={`/incidents/${incident.id}`} className="btn btn-primary btn-sm">
          <span>View in Review Queue</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
