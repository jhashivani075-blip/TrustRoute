'use client';

import React, { use } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, MapPin, Clock, ShieldAlert, Layers } from 'lucide-react';
import ReportTimeline from '@/components/ReportTimeline';
import ScoreBreakdown from '@/components/ScoreBreakdown';
import FlagsPanel from '@/components/FlagsPanel';
import AdvisoryComparison from '@/components/AdvisoryComparison';
import ReviewActionsBar from '@/components/ReviewActionsBar';
import { useIncidentsStore } from '@/lib/store';
import '@/styles/incident-detail.css';

// Dynamic Leaflet map without SSR
const InteractiveMap = dynamic(() => import('@/components/InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div style={{
      height: '220px',
      background: 'var(--bg-input)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-dim)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '6px'
    }}>
      Loading spatial cluster map...
    </div>
  ),
});

export default function IncidentDetailPage({ params }) {
  // In Next.js 16, params is a Promise in client components
  const resolvedParams = use(params);
  const incidentId = resolvedParams.id;

  const {
    incidents,
    audits,
    updateIncidentStatus,
    dismissFlag,
  } = useIncidentsStore();

  const incident = incidents.find((i) => i.id === incidentId);

  if (!incident) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-main)', marginBottom: '12px' }}>Incident Cluster Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          No cluster matching identifier "{incidentId}" is currently tracked in the active scenario store.
        </p>
        <Link href="/incidents" className="btn btn-primary">
          <ArrowLeft size={16} />
          <span>Return to Review Queue</span>
        </Link>
      </div>
    );
  }

  const isHigh = incident.priority_level === 'HIGH';
  const isMedium = incident.priority_level === 'MEDIUM';
  const priorityClass = isHigh ? 'badge-high' : isMedium ? 'badge-medium' : 'badge-low';

  const hasConflict = (incident.flags || []).some(
    (f) => f.state === 'ACTIVE' && f.code.includes('CONFLICT')
  );

  return (
    <div>
      {/* Top Breadcrumb Navigation */}
      <div style={{ marginBottom: '16px' }}>
        <Link href="/incidents" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={14} />
          <span>Back to Review Queue</span>
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className="detail-header">
        <div className="detail-header-left">
          <div className="detail-meta-row">
            <span className="table-id" style={{ fontSize: '1rem' }}>{incident.id}</span>
            <span className="badge badge-hazard">{incident.hazard_type}</span>
            <span className={`badge ${priorityClass}`}>
              {incident.priority_level} PRIORITY ({incident.priority_score}/100)
            </span>
            <span className={`badge ${incident.freshness === 'FRESH' ? 'badge-fresh' : 'badge-aging'}`}>
              <Clock size={12} /> {incident.freshness}
            </span>
            <span className="badge" style={{ background: 'var(--bg-input)', color: 'var(--accent-cyan)' }}>
              STATUS: {incident.status}
            </span>
          </div>

          <h1 className="detail-title">{incident.title}</h1>

          <div className="detail-location">
            <MapPin size={16} color="var(--accent-red)" />
            <span>{incident.location_name}</span>
            <span style={{ color: 'var(--text-dim)' }}>
              (Centroid: {incident.centroid_lat.toFixed(4)}, {incident.centroid_lon.toFixed(4)})
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: isHigh ? 'var(--accent-red)' : 'var(--accent-amber)' }}>
            {incident.priority_score} <span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>/ 100</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Corroborated by {incident.report_count} Reports
          </div>
        </div>
      </div>

      {/* Two-Pane Layout: Left (The Evidence) vs Right (The Intelligence) */}
      <div className="detail-grid">
        {/* Left Pane: The Evidence */}
        <div className="pane-column">
          <div className="pane-header">
            <Layers size={18} color="var(--accent-blue)" />
            <span>The Evidence: Ingested Reports Timeline ({incident.reports?.length || 0})</span>
          </div>

          <ReportTimeline reports={incident.reports || []} />

          <ScoreBreakdown
            breakdown={incident.score_breakdown || {}}
            priorityScore={incident.priority_score}
            priorityLevel={incident.priority_level}
          />
        </div>

        {/* Right Pane: The Intelligence */}
        <div className="pane-column">
          <div className="pane-header">
            <ShieldAlert size={18} color="var(--accent-amber)" />
            <span>The Intelligence: Spatial Fix & Verification Checks</span>
          </div>

          {/* Mini GIS Map for the cluster */}
          <div className="card" style={{ padding: '14px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
              Cluster Member Pins & Advisory Proximity
            </div>
            <InteractiveMap
              incidents={[incident]}
              initialCenter={[incident.centroid_lat, incident.centroid_lon]}
              initialZoom={13}
              height="220px"
            />
          </div>

          {/* Active Flags Panel */}
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>
              Evidence & Uncertainty Flags ({incident.flags?.filter((f) => f.state === 'ACTIVE').length || 0} Active)
            </div>
            <FlagsPanel
              flags={incident.flags || []}
              onDismissFlag={(flagId, reason) => dismissFlag(incident.id, flagId, reason)}
            />
          </div>

          {/* Side-by-side Official Advisory Comparison */}
          <AdvisoryComparison
            advisories={incident.advisories || []}
            reports={incident.reports || []}
            hasConflict={hasConflict}
          />
        </div>
      </div>

      {/* Human-In-The-Loop Action Bar & Audit Trail */}
      <ReviewActionsBar
        incidentId={incident.id}
        status={incident.status}
        audits={audits}
        onAction={(id, action, notes) => updateIncidentStatus(id, action, notes)}
      />
    </div>
  );
}
