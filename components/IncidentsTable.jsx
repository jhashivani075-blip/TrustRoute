'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, AlertTriangle, Clock, MapPin } from 'lucide-react';

export default function IncidentsTable({ incidents = [], showHeader = true }) {
  if (!incidents || incidents.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
        No incident clusters matching criteria.
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        {showHeader && (
          <thead>
            <tr>
              <th>ID</th>
              <th>Incident & Location</th>
              <th>Hazard</th>
              <th>Reports</th>
              <th>Active Flags</th>
              <th>Freshness</th>
              <th>Priority Score</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
        )}
        <tbody>
          {incidents.map((inc) => {
            const isHigh = inc.priority_level === 'HIGH';
            const isMedium = inc.priority_level === 'MEDIUM';
            const priorityClass = isHigh ? 'badge-high' : isMedium ? 'badge-medium' : 'badge-low';

            const freshnessClass =
              inc.freshness === 'FRESH'
                ? 'badge-fresh'
                : inc.freshness === 'AGING'
                ? 'badge-aging'
                : 'badge-outdated';

            const activeFlags = (inc.flags || []).filter((f) => f.state === 'ACTIVE');

            return (
              <tr key={inc.id}>
                <td>
                  <span className="table-id">{inc.id}</span>
                </td>
                <td style={{ maxWidth: '320px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '3px' }}>
                    {inc.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <MapPin size={12} />
                    <span>{inc.location_name}</span>
                  </div>
                </td>
                <td>
                  <span className="badge badge-hazard">{inc.hazard_type}</span>
                </td>
                <td>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    {inc.report_count || 1}
                  </span>
                </td>
                <td>
                  <div className="incident-flags-cell">
                    {activeFlags.length > 0 ? (
                      activeFlags.slice(0, 2).map((f) => {
                        const isConflict = f.code.includes('CONFLICT');
                        return (
                          <span
                            key={f.id}
                            className={`flag-pill ${isConflict ? 'conflict' : ''}`}
                            title={f.message}
                          >
                            <AlertTriangle size={11} />
                            {f.code.replace('_', ' ')}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>None</span>
                    )}
                    {activeFlags.length > 2 && (
                      <span className="flag-pill">+{activeFlags.length - 2} more</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`badge ${freshnessClass}`}>
                    <Clock size={11} />
                    {inc.freshness}
                  </span>
                </td>
                <td>
                  <div className="score-meter">
                    <span className={`badge ${priorityClass}`}>
                      {inc.priority_score}/100
                    </span>
                    <div className="score-bar-bg">
                      <div
                        className="score-bar-fill"
                        style={{
                          width: `${inc.priority_score}%`,
                          background: isHigh ? '#ef4444' : isMedium ? '#f59e0b' : '#06b6d4',
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    className="badge"
                    style={{
                      background:
                        inc.status === 'REVIEWED'
                          ? 'var(--accent-green-bg)'
                          : inc.status === 'NEEDS_VERIFICATION'
                          ? 'var(--accent-amber-bg)'
                          : 'var(--bg-input)',
                      color:
                        inc.status === 'REVIEWED'
                          ? 'var(--accent-green)'
                          : inc.status === 'NEEDS_VERIFICATION'
                          ? 'var(--accent-amber)'
                          : 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {inc.status}
                  </span>
                </td>
                <td>
                  <Link href={`/incidents/${inc.id}`} className="btn btn-sm btn-secondary">
                    Review <ChevronRight size={14} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
