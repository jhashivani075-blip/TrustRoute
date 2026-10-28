'use client';

import React, { useState } from 'react';
import { UploadCloud, X, CheckCircle2, FileText } from 'lucide-react';
import { submitReportLocally } from '@/lib/store';

export default function BulkUploadModal({ isOpen, onClose, onUploadComplete }) {
  const [csvText, setCsvText] = useState('');
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSimulateBatchLoad = () => {
    setIsProcessing(true);

    // Batch of 10 simulated rapid incoming reports across Guwahati & Himachal
    const syntheticBatch = [
      {
        location_text: 'Ward 12, Sluice Gate Approach',
        lat: 26.1450,
        lon: 91.7370,
        description: 'Water level surging over embankment, family of 4 stranded near temple roof.',
        reported_severity: 'HIGH',
        source_type: 'CITIZEN',
        source_detail: 'Emergency line call +91-98711-XXXXX',
      },
      {
        location_text: 'Bharalu bridge north end',
        lat: 26.1554,
        lon: 91.7285,
        description: 'Cars driving past police tape onto submerged bridge, urgent barricade needed.',
        reported_severity: 'HIGH',
        source_type: 'RESPONDER',
        source_detail: 'Traffic Warden 9',
      },
      {
        location_text: 'NH-21 KM 143, Pandoh',
        lat: 31.7095,
        lon: 77.0145,
        description: 'Secondary rockfall damaged guard rail. No casualties yet but road blocked.',
        reported_severity: 'CRITICAL',
        source_type: 'OFFICIAL',
        source_detail: 'NHAI Control Van',
      },
      {
        location_text: 'Milan Subway Santacruz',
        lat: 19.0834,
        lon: 72.8468,
        description: 'Water 4 feet deep. Pumping engine failed.',
        reported_severity: 'MEDIUM',
        source_type: 'CITIZEN',
        source_detail: 'Commuter App',
      },
      {
        location_text: 'Jalukbari Circle',
        lat: 26.1481,
        lon: 91.6622,
        description: 'Water cleared from rotunda, slow traffic moving towards airport.',
        reported_severity: 'LOW',
        source_type: 'MEDIA',
        source_detail: 'Radio Channel 92.7',
      },
    ];

    syntheticBatch.forEach((rep) => {
      submitReportLocally(rep);
    });

    setIsProcessing(false);
    setUploadStatus(`Successfully processed ${syntheticBatch.length} reports. Clusters rescored and updated.`);
    if (onUploadComplete) onUploadComplete();
  };

  const handleCustomCsvProcess = () => {
    if (!csvText.trim()) return;
    setIsProcessing(true);

    const lines = csvText.split('\n').filter((l) => l.trim().length > 0);
    let count = 0;

    lines.forEach((line) => {
      const parts = line.split(',');
      if (parts.length >= 3) {
        submitReportLocally({
          location_text: parts[0]?.trim() || 'Unknown Loc',
          lat: parseFloat(parts[1]) || 26.1445,
          lon: parseFloat(parts[2]) || 91.7362,
          description: parts[3]?.trim() || 'Inundation reported',
          reported_severity: (parts[4]?.trim()?.toUpperCase()) || 'HIGH',
          source_type: 'CITIZEN',
          source_detail: 'Bulk CSV Row',
        });
        count++;
      }
    });

    setIsProcessing(false);
    setUploadStatus(`Imported ${count} reports successfully.`);
    if (onUploadComplete) onUploadComplete();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadCloud size={20} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Bulk Incident Ingestion (CSV / Synthetic Batch)
            </h3>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            For hackathon demos and high-load stress testing, you can inject pre-calibrated synthetic disaster reports in seconds:
          </p>

          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px' }}
            onClick={handleSimulateBatchLoad}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing Batch...' : '⚡ Load Pre-calibrated 5-Report Rapid Surge'}
          </button>

          <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem', margin: '4px 0' }}>
            — OR PASTE RAW CSV ROWS (location, lat, lon, description, severity) —
          </div>

          <textarea
            className="form-textarea"
            rows={5}
            placeholder="Ward 12 Riverside, 26.145, 91.736, Water entering ground floor, HIGH"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />

          {uploadStatus && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--accent-green-bg)',
              color: 'var(--accent-green)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem'
            }}>
              <CheckCircle2 size={16} />
              <span>{uploadStatus}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleCustomCsvProcess}
            disabled={!csvText.trim() || isProcessing}
          >
            Import CSV Rows
          </button>
        </div>
      </div>
    </div>
  );
}
