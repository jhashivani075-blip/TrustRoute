'use client';

import React, { useState } from 'react';
import { PlusCircle, Info, ShieldCheck } from 'lucide-react';
import ReportForm from '@/components/ReportForm';
import SubmissionFeedbackCard from '@/components/SubmissionFeedbackCard';
import '@/styles/submit.css';

export default function SubmitReportPage() {
  const [submissionResult, setSubmissionResult] = useState(null);

  return (
    <div className="submit-layout">
      {/* Header */}
      <div className="submit-header">
        <h1>
          <PlusCircle size={28} color="var(--accent-red)" />
          Disaster Incident Intake Hub
        </h1>
        <p>
          Submit live field observations, citizen calls, or responder reports. Ingested reports are evaluated for duplicate clustering, freshness windows, and advisory contradictions.
        </p>
      </div>

      {/* Immediate Post-Submission Feedback Card */}
      {submissionResult ? (
        <div>
          <SubmissionFeedbackCard
            result={submissionResult}
            onReset={() => setSubmissionResult(null)}
          />
        </div>
      ) : (
        <div>
          <div style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px 18px',
            marginBottom: '20px',
            fontSize: '0.875rem',
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Info size={20} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
            <span>
              <strong>Simulated Verification Mode:</strong> Incoming submissions are run through the clustering engine and deterministic priority scorer in real time.
            </span>
          </div>

          <ReportForm onSubmissionSuccess={(result) => setSubmissionResult(result)} />
        </div>
      )}
    </div>
  );
}
