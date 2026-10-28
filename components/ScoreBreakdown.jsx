'use client';

import React from 'react';
import { Calculator, Info } from 'lucide-react';

export default function ScoreBreakdown({ breakdown = {}, priorityScore = 0, priorityLevel = 'LOW' }) {
  const {
    urgency = 50,
    freshness_factor = 1.0,
    corroboration = 0,
    conflict_attention = 0,
    details = {},
  } = breakdown;

  const isHigh = priorityLevel === 'HIGH';
  const isMedium = priorityLevel === 'MEDIUM';
  const badgeClass = isHigh ? 'badge-high' : isMedium ? 'badge-medium' : 'badge-low';

  return (
    <div className="score-breakdown-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text-main)' }}>
          <Calculator size={18} color="var(--accent-blue)" />
          <span>Deterministic Review Priority</span>
        </div>
        <span className={`badge ${badgeClass}`} style={{ fontSize: '0.85rem' }}>
          {priorityLevel} ({priorityScore}/100)
        </span>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Computed via pure transparent rules. The AI/LLM never generates a score or renders truth verdicts.
      </p>

      <div className="formula-display">
        Priority = min(100, (Urgency × FreshnessFactor) + Corroboration + ConflictAttention)
      </div>

      <div className="score-row">
        <div>
          <strong>1. Urgency</strong>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '6px' }}>
            (Base: {details.base_severity || 50} + Safety Cues: +{details.safety_cue_bonus || 0})
          </span>
        </div>
        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{urgency} / 100</span>
      </div>

      <div className="score-row">
        <div>
          <strong>2. Freshness Factor</strong>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '6px' }}>
            (Decays over time based on hazard window)
          </span>
        </div>
        <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>× {freshness_factor}</span>
      </div>

      <div className="score-row">
        <div>
          <strong>3. Corroboration</strong>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '6px' }}>
            ({details.independent_sources || 1} independent sources)
          </span>
        </div>
        <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>+ {corroboration}</span>
      </div>

      <div className="score-row">
        <div>
          <strong>4. Conflict Attention</strong>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '6px' }}>
            {details.conflict_reason ? `(${details.conflict_reason})` : '(No active contradiction)'}
          </span>
        </div>
        <span style={{ fontWeight: 700, color: conflict_attention > 0 ? 'var(--accent-red)' : 'var(--text-dim)' }}>
          + {conflict_attention}
        </span>
      </div>

      <div className="score-total-row">
        <span>Calculated Review Priority:</span>
        <span style={{ color: isHigh ? 'var(--accent-red)' : isMedium ? 'var(--accent-amber)' : 'var(--accent-cyan)' }}>
          {priorityScore} / 100
        </span>
      </div>
    </div>
  );
}
