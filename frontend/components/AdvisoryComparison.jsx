'use client';

import React from 'react';
import { FileCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function AdvisoryComparison({ advisories = [], reports = [], hasConflict = false }) {
  if (!advisories || advisories.length === 0) {
    return (
      <div className="card" style={{ padding: '20px', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileCheck size={18} color="var(--accent-blue)" />
          <span>No official government advisories currently active in this geographic zone.</span>
        </div>
      </div>
    );
  }

  const primaryAdvisory = advisories[0];
  const citizenClaims = reports
    .filter((r) => r.extracted?.claims && r.extracted.claims.length > 0)
    .flatMap((r) => r.extracted.claims);

  return (
    <div className="advisory-diff-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text-main)' }}>
          <ShieldAlert size={18} color={hasConflict ? 'var(--accent-red)' : 'var(--accent-green)'} />
          <span>Official Advisory Cross-Verification</span>
        </div>
        <span
          className="badge"
          style={{
            background: hasConflict ? 'var(--accent-red-bg)' : 'var(--accent-green-bg)',
            color: hasConflict ? 'var(--accent-red)' : 'var(--accent-green)',
            borderColor: hasConflict ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)',
          }}
        >
          {hasConflict ? 'Discrepancy Flagged' : 'Aligned with Advisory'}
        </span>
      </div>

      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
        Issuer: <strong>{primaryAdvisory.issuer}</strong> • Coverage Radius: {primaryAdvisory.radius_km} km
      </div>

      <div className="advisory-diff-grid">
        {/* Left Column: Citizen Report Claims */}
        <div className="diff-col">
          <h5>Citizen & Crowd Claims</h5>
          {reports.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontStyle: 'italic', background: 'var(--bg-card)', padding: '10px', borderRadius: '4px' }}>
                "{reports[0].description}"
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {citizenClaims.map((c, i) => (
                  <span key={i} className="badge badge-hazard" style={{ fontSize: '0.7rem' }}>
                    {c.entity}: <strong>{c.state}</strong>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>No extracted claims.</p>
          )}
        </div>

        {/* Right Column: Official Advisory Assertions */}
        <div className="diff-col" style={{ borderColor: hasConflict ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)' }}>
          <h5>Official Government Advisory: {primaryAdvisory.title}</h5>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '10px', lineHeight: 1.5 }}>
            {primaryAdvisory.text}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {primaryAdvisory.assertions.map((ast, i) => (
              <span
                key={i}
                className="badge"
                style={{
                  fontSize: '0.7rem',
                  background: ast.state.includes('CLOSED') ? 'var(--accent-red-bg)' : 'var(--accent-green-bg)',
                  color: ast.state.includes('CLOSED') ? 'var(--accent-red)' : 'var(--accent-green)',
                }}
              >
                {ast.entity}: <strong>{ast.state}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
