'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight, MapPin, RefreshCw, PlusCircle, ShieldAlert } from 'lucide-react';
import StatCards from '../../components/StatCards';
import DashboardCharts from '../../components/DashboardCharts';
import IncidentsTable from '../../components/IncidentsTable';
import { useIncidentsStore } from '../../lib/store';
import '../../styles/dashboard.css';

// Dynamic Leaflet map without SSR
const InteractiveMap = dynamic(() => import('../../components/InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div style={{
      height: '480px',
      background: 'var(--bg-input)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-dim)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '8px'
    }}>
      Loading interactive GIS disaster pins...
    </div>
  ),
});

export default function DashboardPage() {
  const { incidents, refresh, resetToSeedData } = useIncidentsStore();

  // Top 5 pending incidents sorted by priority score descending
  const topPending = [...incidents]
    .filter((i) => i.status !== 'RESOLVED')
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 5);

  return (
    <div className="dashboard-light">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h1>
            <ShieldAlert size={28} color="var(--accent-red)" />
            Command Center: Disaster Verification Operations
          </h1>
          <p>
            Real-time multi-hazard cluster ingestion, deterministic priority scoring, and human triage.
          </p>
        </div>

        <div className="dashboard-actions">
          <button
            className="btn btn-outline btn-sm"
            onClick={resetToSeedData}
            title="Reset store to initial hackathon dataset"
          >
            <RefreshCw size={14} />
            Reset Data
          </button>

          <Link href="/submit" className="btn btn-primary btn-sm">
            <PlusCircle size={15} />
            <span>Submit Report</span>
          </Link>
        </div>
      </div>

      {/* Top Row: KPIs */}
      <StatCards incidents={incidents} />

      {/* Middle Row: GIS Map & Analytics Charts */}
      <div className="dashboard-grid-middle">
        {/* Left: Interactive Map */}
        <div className="card map-card">
          <div className="card-header">
            <div className="card-title">
              <MapPin size={18} color="var(--accent-blue)" />
              <span>Spatial Incident Clusters & High-Risk Zones</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              OpenStreetMap Telemetry
            </span>
          </div>

          <div style={{ flex: 1, minHeight: '340px' }}>
            <InteractiveMap
              incidents={incidents}
              initialCenter={[26.1445, 91.7362]}
              initialZoom={11}
              height="360px"
            />
          </div>

          <div className="map-legend">
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#ef4444' }} />
              <span>High Priority (70-100)</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#f59e0b' }} />
              <span>Medium Priority (40-69)</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#06b6d4' }} />
              <span>Low Priority (0-39)</span>
            </div>
            <div className="legend-item" style={{ marginLeft: 'auto', color: 'var(--accent-amber)' }}>
              <span>Dashed Border = Active Flag</span>
            </div>
          </div>
        </div>

        {/* Right: SVG Volume & Flags Analytics */}
        <DashboardCharts incidents={incidents} />
      </div>

      {/* Bottom Row: Top 5 Pending Incidents for Immediate Review */}
      <div className="card dashboard-queue-card">
        <div className="card-header">
          <div>
            <div className="card-title">
              Top Priority Incidents Awaiting Coordinator Review
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Ranked deterministically by Urgency × Freshness + Corroboration + Conflict Attention.
            </p>
          </div>

          <Link href="/incidents" className="btn btn-secondary btn-sm">
            <span>View All ({incidents.length})</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <IncidentsTable incidents={topPending} showHeader={true} />
      </div>
    </div>
  );
}
