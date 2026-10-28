'use client';

import React from 'react';

/**
 * Pure SVG responsive charts for Command Center Analytics
 * Avoids heavy 3rd-party dependencies while rendering smooth disaster telemetry
 */
export default function DashboardCharts({ incidents = [] }) {
  // Aggregate flags by type
  const flagCounts = {
    'LOCATION_CONFLICT': 0,
    'ADVISORY_CONFLICT': 0,
    'MISSING_SOURCE': 0,
    'OUTDATED': 0,
    'INCOMPLETE': 0,
  };

  incidents.forEach((inc) => {
    (inc.flags || []).forEach((f) => {
      if (flagCounts[f.code] !== undefined) {
        flagCounts[f.code] += 1;
      }
    });
  });

  const barData = [
    { label: 'Location Conflict', count: flagCounts.LOCATION_CONFLICT, color: '#ef4444' },
    { label: 'Advisory Conflict', count: flagCounts.ADVISORY_CONFLICT, color: '#f59e0b' },
    { label: 'Missing Source', count: flagCounts.MISSING_SOURCE, color: '#38bdf8' },
    { label: 'Stale (Outdated)', count: flagCounts.OUTDATED, color: '#64748b' },
  ];

  const maxBarCount = Math.max(1, ...barData.map((d) => d.count));

  // Area Chart points for volume over time
  // Coordinates for a 500x120 SVG viewBox
  const areaPoints = "0,110 50,90 100,95 150,60 200,75 250,40 300,50 350,25 400,30 450,15 500,20";
  const areaPath = `M0,120 L0,110 50,90 100,95 150,60 200,75 250,40 300,50 350,25 400,30 450,15 500,20 L500,120 Z`;

  return (
    <div className="analytics-card card">
      {/* 1. Reports Volume Over Time (Area Chart) */}
      <div className="chart-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="chart-title">Incoming Reports Velocity (Past 12 Hours)</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 700 }}>
            ▲ +24% surge
          </span>
        </div>
        <div className="chart-wrapper">
          <svg viewBox="0 0 500 120" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Grid horizontal lines */}
            <line x1="0" y1="30" x2="500" y2="30" stroke="#1c283f" strokeDasharray="3 3" />
            <line x1="0" y1="70" x2="500" y2="70" stroke="#1c283f" strokeDasharray="3 3" />
            <line x1="0" y1="110" x2="500" y2="110" stroke="#1c283f" />

            {/* Gradient fill area */}
            <path d={areaPath} fill="url(#areaGradient)" />

            {/* Top glowing line */}
            <polyline
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              points={areaPoints}
            />

            {/* Key peaks dots */}
            <circle cx="250" cy="40" r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="450" cy="15" r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
          </svg>
        </div>
      </div>

      {/* 2. Flags Distribution (Bar Chart) */}
      <div className="chart-section">
        <span className="chart-title">Active Review Flags Distribution</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
          {barData.map((b, idx) => {
            const pct = Math.round((b.count / maxBarCount) * 100);
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{b.label}</span>
                  <span style={{ fontWeight: 700, color: b.color }}>{b.count} flags</span>
                </div>
                <div style={{
                  height: '6px',
                  background: 'var(--bg-input)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{
                    width: `${Math.max(8, pct)}%`,
                    height: '100%',
                    background: b.color,
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
