'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Send, MapPin, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { submitReport } from '@/lib/api';

// Dynamic Leaflet map without SSR
const InteractiveMap = dynamic(() => import('@/components/InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '260px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
      Loading interactive map pin picker...
    </div>
  ),
});

export default function ReportForm({ onSubmissionSuccess }) {
  const [locationText, setLocationText] = useState('Ward 12, Riverside');
  const [lat, setLat] = useState(26.1448);
  const [lon, setLon] = useState(91.7365);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('HIGH');
  const [sourceType, setSourceType] = useState('CITIZEN');
  const [sourceDetail, setSourceDetail] = useState('+91 98640-XXXXX');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleMapPinSelected = (newLat, newLng) => {
    setLat(parseFloat(newLat.toFixed(5)));
    setLon(parseFloat(newLng.toFixed(5)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Please describe what is happening on the ground.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const payload = {
        location_text: locationText.trim(),
        lat,
        lon,
        description: description.trim(),
        reported_severity: severity,
        source_type: sourceType,
        source_detail: sourceDetail.trim(),
        evidence_url: evidenceUrl.trim() || undefined,
        reported_at: new Date().toISOString(),
      };

      const result = await submitReport(payload);
      setIsSubmitting(false);
      if (onSubmissionSuccess) {
        onSubmissionSuccess(result);
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg('Failed to process incident submission. Check parameters.');
    }
  };

  return (
    <form className="submit-card" onSubmit={handleSubmit}>
      {errorMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--accent-red-bg)',
          color: 'var(--accent-red)',
          padding: '12px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '18px',
          fontSize: '0.85rem'
        }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Location Field & Coordinates */}
      <div className="form-group">
        <label className="form-label">Location / Neighborhood Landmark *</label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px' }}
            placeholder="e.g. Ward 12 Riverside, near Bharalu Bridge, Guwahati"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            required
          />
          <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-red)' }} />
        </div>
      </div>

      {/* Interactive Click-to-Pin Leaflet Map */}
      <div className="map-picker-wrapper">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="form-label">Drop Pin on Interactive Map</label>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>
            Lat: {lat.toFixed(4)}, Lon: {lon.toFixed(4)}
          </span>
        </div>
        <div className="map-picker-help">
          <MapPin size={13} />
          <span>Click anywhere on the map to drop or update the incident GPS coordinate marker:</span>
        </div>
        <div className="map-picker-container">
          <InteractiveMap
            interactivePin={true}
            initialCenter={[lat, lon]}
            initialZoom={13}
            onLocationSelect={handleMapPinSelected}
            height="260px"
          />
        </div>
      </div>

      {/* Description Field */}
      <div className="form-group">
        <label className="form-label">Incident Observation & Condition Details *</label>
        <textarea
          className="form-textarea"
          rows={4}
          placeholder="Describe water depth, structural damages, trapped persons, road blockages, or urgent medical needs..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      {/* Severity Selector Chips */}
      <div className="form-group">
        <label className="form-label">Reported Severity Level</label>
        <div className="severity-options">
          {[
            { level: 'CRITICAL', label: 'CRITICAL (Life-Safety)', cls: 'active-critical' },
            { level: 'HIGH', label: 'HIGH (Severe Damage)', cls: 'active-high' },
            { level: 'MEDIUM', label: 'MEDIUM (Moderate Risk)', cls: 'active-medium' },
            { level: 'LOW', label: 'LOW (Advisory / Stale)', cls: 'active-low' },
          ].map((item) => (
            <button
              type="button"
              key={item.level}
              className={`severity-btn ${severity === item.level ? item.cls : ''}`}
              onClick={() => setSeverity(item.level)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Source Details Grid */}
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Source Classification</label>
          <select
            className="form-select"
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
          >
            <option value="CITIZEN">Citizen / Eyewitness</option>
            <option value="RESPONDER">First Responder / Volunteer</option>
            <option value="OFFICIAL">Official Agency Personnel</option>
            <option value="MEDIA">News / Media Field Unit</option>
            <option value="SOCIAL">Social Media Broadcast</option>
            <option value="UNKNOWN">Anonymous / Unknown</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Source Contact Detail / Identifier</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Verified Phone +91 98XXX-XXXXX or Unit 4"
            value={sourceDetail}
            onChange={(e) => setSourceDetail(e.target.value)}
          />
        </div>
      </div>

      {/* Optional Evidence URL */}
      <div className="form-group">
        <label className="form-label">Optional Evidence URL (Photo, Video, Tweet)</label>
        <div style={{ position: 'relative' }}>
          <input
            type="url"
            className="form-input"
            style={{ paddingLeft: '36px' }}
            placeholder="https://twitter.com/... or https://drive.google.com/..."
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
          />
          <LinkIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ padding: '12px 28px', fontSize: '0.95rem' }}
          disabled={isSubmitting}
        >
          <Send size={16} />
          <span>{isSubmitting ? 'Evaluating & Clustering...' : 'Submit Disaster Report'}</span>
        </button>
      </div>
    </form>
  );
}
