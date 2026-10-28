'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ArrowRight,
  Layers,
  FileCheck2,
  Users2,
  PlusCircle,
  Activity,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import '@/styles/landing.css';
import { useIncidentsStore } from '@/lib/store';

export default function LandingPage() {
  const { incidents, isLoaded } = useIncidentsStore();

  const highPriorityCount = incidents.filter(
    (i) => i.priority_level === 'HIGH' && i.status !== 'RESOLVED'
  ).length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-tag">
          <Activity size={14} />
          <span>Hackathon Disaster Intelligence Platform</span>
        </div>

        <h1 className="hero-title">
          AI Organizes the Chaos. <br />
          <span>Humans Decide the Action.</span>
        </h1>

        <p className="hero-subtitle">
          In rapid-onset disasters, hundreds of conflicting, duplicate, and stale reports flood emergency control rooms.
          <strong> TrustRoute</strong> groups duplicates, cross-checks official advisories, flags ambiguities, and scores review priority—without ever guessing truth or replacing human judgment.
        </p>

        <div className="hero-actions">
          <Link href="/dashboard" className="btn btn-primary" style={{ padding: '12px 26px', fontSize: '1rem' }}>
            <span>Launch Command Center</span>
            <ArrowRight size={18} />
          </Link>

          <Link href="/incidents" className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '1rem' }}>
            <span>Explore Review Queue ({incidents.length} Clusters)</span>
          </Link>

          <Link href="/submit" className="btn btn-outline" style={{ padding: '12px 22px', fontSize: '1rem' }}>
            <PlusCircle size={18} color="var(--accent-red)" />
            <span>Submit Disaster Report</span>
          </Link>
        </div>

        {/* Core Mission Banner */}
        <div className="mission-banner">
          <div className="mission-icon">
            <ShieldAlert size={28} />
          </div>
          <div className="mission-text">
            <h3>Mission Statement & Architectural Philosophy</h3>
            <p>
              To build a credible, explainable, and visually clear prototype that organizes incoming disaster reports,
              groups duplicates, flags outdated, incomplete or conflicting information for human review, and suggests a
              review priority, <strong>without ever declaring a report true or false on its own</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* 3 Pillars Feature Grid */}
      <section>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
            Core Architectural Capabilities
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Engineered specifically to solve real emergency coordination bottlenecks during flooding, landslides, and cyclones.
          </p>
        </div>

        <div className="features-grid">
          {/* Feature 1 */}
          <div className="feature-card">
            <div className="feature-icon-wrapper icon-blue">
              <Layers size={22} />
            </div>
            <h3 className="feature-title">Semantic & Spatial Clustering</h3>
            <p className="feature-desc">
              Near-duplicate citizen calls and social posts are collapsed into unified incident clusters using multi-dimensional matching: hazard type, geo-distance, and time window.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
              <span className="badge badge-hazard" style={{ fontSize: '0.7rem' }}>
                Prevents duplicate dispatch
              </span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="feature-card">
            <div className="feature-icon-wrapper icon-amber">
              <FileCheck2 size={22} />
            </div>
            <h3 className="feature-title">Advisory Cross-Verification</h3>
            <p className="feature-desc">
              Automatic comparison between crowd claims and official state advisories (e.g. SDMA sluice closures or bridge warnings). Highlights exact contradictions side-by-side.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
              <span className="badge badge-medium" style={{ fontSize: '0.7rem' }}>
                Flags: "Needs Review"
              </span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="feature-card">
            <div className="feature-icon-wrapper icon-green">
              <Sliders size={22} />
            </div>
            <h3 className="feature-title">Deterministic Review Priority</h3>
            <p className="feature-desc">
              Calculates a fully explainable priority score (0–100) combining reported severity, life-safety cues, decay-adjusted freshness, corroboration bonus, and conflict attention.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
              <span className="badge badge-fresh" style={{ fontSize: '0.7rem' }}>
                Pure math, no black-box LLM
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Scenario Telemetry Bar */}
      <section style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '24px 30px',
        marginBottom: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
            Active Simulation Datasets
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
            Guwahati Brahmaputra Floods &bull; Mandi-Pandoh NH-21 Landslides &bull; Mumbai Subway Inundations
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-red)' }}>
              {highPriorityCount} High Urgency
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Pending Coordinator Review
            </div>
          </div>
          <Link href="/dashboard" className="btn btn-primary btn-sm">
            Triage Now <ChevronRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
