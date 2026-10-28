'use client';

import React from 'react';
import { Clock, Shield, User, Radio, Megaphone } from 'lucide-react';

export default function ReportTimeline({ reports = [] }) {
  if (!reports || reports.length === 0) {
    return <div style={{ color: 'var(--text-dim)' }}>No individual reports logged in this cluster.</div>;
  }

  // Highlight life safety cues in text
  const highlightCues = (text) => {
    if (!text) return '';
    const regex = /(trap|stuck|stranded|elderly|child|infant|injur|bleed|hospital|doctor|submerged|chest level|rising fast|shooting stones|boulder|fire|smoke)/gi;
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (regex.test(part)) {
        return (
          <span key={i} className="highlight-snippet">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const getSourceIcon = (type) => {
    switch (type) {
      case 'RESPONDER':
        return <Shield size={14} color="var(--accent-green)" />;
      case 'MEDIA':
        return <Megaphone size={14} color="var(--accent-purple)" />;
      case 'OFFICIAL':
        return <Radio size={14} color="var(--accent-blue)" />;
      default:
        return <User size={14} color="var(--text-muted)" />;
    }
  };

  return (
    <div className="timeline">
      {reports.map((r, idx) => {
        const isFresh = r.freshness === 'FRESH';
        const freshnessClass = isFresh ? 'badge-fresh' : r.freshness === 'AGING' ? 'badge-aging' : 'badge-outdated';

        return (
          <div key={r.id || idx} className="timeline-item">
            <div className="report-top-meta">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="source-badge-item">
                  {getSourceIcon(r.source_type)}
                  <span>{r.source_type}</span>
                </div>
                <span style={{ color: 'var(--text-dim)' }}>•</span>
                <span style={{ color: 'var(--text-muted)' }}>{r.source_detail || 'Anonymous'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className={`badge ${freshnessClass}`}>
                  <Clock size={11} /> {r.freshness}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {new Date(r.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <div className="report-text">{highlightCues(r.description)}</div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', paddingTop: '4px' }}>
              <span>📍 {r.location_text} ({r.lat.toFixed(4)}, {r.lon.toFixed(4)})</span>
              <span style={{ fontWeight: 600, color: r.reported_severity === 'CRITICAL' ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                Severity: {r.reported_severity}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
