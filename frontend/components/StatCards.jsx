'use client';

import React from 'react';
import { Layers, AlertTriangle, Flag, Copy } from 'lucide-react';

export default function StatCards({ incidents = [] }) {
  const totalClusters = incidents.length;
  const highPriorityPending = incidents.filter(
    (i) => i.priority_level === 'HIGH' && i.status !== 'RESOLVED'
  ).length;

  // Active flags count across incidents
  const totalFlagged = incidents.reduce((acc, inc) => {
    const activeFlags = (inc.flags || []).filter((f) => f.state === 'ACTIVE');
    return acc + activeFlags.length;
  }, 0);

  // Duplicates grouped (total reports minus clusters)
  const totalReports = incidents.reduce((acc, inc) => acc + (inc.report_count || 1), 0);
  const duplicatesGrouped = Math.max(0, totalReports - totalClusters);

  const stats = [
    {
      label: 'Incident Clusters',
      value: totalClusters,
      meta: `${totalReports} raw reports ingested`,
      icon: Layers,
      colorBg: 'rgba(59, 130, 246, 0.15)',
      colorText: 'var(--accent-blue)',
    },
    {
      label: 'High Priority Pending',
      value: highPriorityPending,
      meta: 'Urgent action required',
      icon: AlertTriangle,
      colorBg: 'rgba(239, 68, 68, 0.15)',
      colorText: 'var(--accent-red)',
      urgent: highPriorityPending > 0,
    },
    {
      label: 'Active Evidence Flags',
      value: totalFlagged,
      meta: 'Contradictions & ambiguities',
      icon: Flag,
      colorBg: 'rgba(245, 158, 11, 0.15)',
      colorText: 'var(--accent-amber)',
    },
    {
      label: 'Duplicates Grouped',
      value: duplicatesGrouped,
      meta: 'Merged into coherent clusters',
      icon: Copy,
      colorBg: 'rgba(16, 185, 129, 0.15)',
      colorText: 'var(--accent-green)',
    },
  ];

  return (
    <div className="stat-cards-grid">
      {stats.map((s, idx) => {
        const Icon = s.icon;
        return (
          <div key={idx} className="stat-card">
            <div className="stat-info">
              <span className="stat-label">{s.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="stat-value">{s.value}</span>
                {s.urgent && (
                  <span
                    className="badge badge-high pulse-urgent"
                    style={{ fontSize: '0.65rem', padding: '2px 6px' }}
                  >
                    Action Req
                  </span>
                )}
              </div>
              <span className="stat-meta">{s.meta}</span>
            </div>
            <div className="stat-icon" style={{ background: s.colorBg, color: s.colorText }}>
              <Icon size={24} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
