/**
 * Modular API client for TrustRoute
 * Follows TrustRoute Technical Blueprint Section 8
 * Seamlessly talks to FastAPI backend when NEXT_PUBLIC_API_URL is configured,
 * or operates in self-contained simulation mode for offline hackathon demos.
 */

import { getStoredIncidents, submitReportLocally, getStoredAudits } from './store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const isLiveBackendConnected = Boolean(API_BASE_URL);

/**
 * Ingest new incident report
 * Endpoint: POST /api/v1/reports
 */
export async function submitReport(payload) {
  if (isLiveBackendConnected) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`API error: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.warn('Live backend failed, falling back to local simulation engine:', err);
    }
  }

  // Local simulated fallback
  return submitReportLocally(payload);
}

/**
 * Fetch incident clusters with optional filtering
 * Endpoint: GET /api/v1/incidents
 */
export async function fetchIncidents(params = {}) {
  if (isLiveBackendConnected) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE_URL}/api/v1/incidents?${query}`);
      if (!res.ok) {
        throw new Error(`API error: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.warn('Live backend failed, falling back to local simulation engine:', err);
    }
  }

  // Local simulated fallback
  const all = getStoredIncidents();
  let filtered = [...all];

  if (params.hazard) {
    filtered = filtered.filter((i) => i.hazard_type === params.hazard);
  }
  if (params.priority) {
    filtered = filtered.filter((i) => i.priority_level === params.priority);
  }
  if (params.status) {
    filtered = filtered.filter((i) => i.status === params.status);
  }
  if (params.freshness) {
    filtered = filtered.filter((i) => i.freshness === params.freshness);
  }
  if (params.q) {
    const q = params.q.toLowerCase();
    filtered = filtered.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.location_name.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)
    );
  }

  return {
    total: filtered.length,
    items: filtered,
  };
}

/**
 * Fetch detailed incident cluster by ID
 * Endpoint: GET /api/v1/incidents/{id}
 */
export async function fetchIncidentById(id) {
  if (isLiveBackendConnected) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/incidents/${id}`);
      if (!res.ok) {
        throw new Error(`API error: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.warn('Live backend failed, falling back to local simulation engine:', err);
    }
  }

  const all = getStoredIncidents();
  const incident = all.find((i) => i.id === id);
  if (!incident) {
    throw new Error(`Incident ${id} not found`);
  }
  return incident;
}

/**
 * Submit human review decision
 * Endpoint: POST /api/v1/incidents/{id}/review
 */
export async function submitIncidentReview(id, reviewPayload) {
  if (isLiveBackendConnected) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/incidents/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewPayload),
      });
      if (!res.ok) {
        throw new Error(`API error: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.warn('Live backend failed, falling back to local simulation engine:', err);
    }
  }

  return {
    incident_id: id,
    status: reviewPayload.action === 'CONFIRM' ? 'REVIEWED' : 'PENDING',
    priority_score: 75,
    audit_id: Math.floor(Math.random() * 900) + 100,
  };
}
