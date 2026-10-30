'use client';

import { fetchIncidents, submitIncidentReview } from './api';
import { useState, useEffect } from 'react';
import { INITIAL_INCIDENTS, INITIAL_AUDIT_LOGS, INITIAL_ADVISORIES } from './mock-data';
import { calculateFreshness, computeClusterScore } from './scoring';

/**
 * Haversine formula to compute distance in km
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const STORAGE_KEY_INCIDENTS = 'trustroute_incidents_js_v1';
const STORAGE_KEY_AUDITS = 'trustroute_audits_js_v1';

export function getStoredIncidents() {
  if (typeof window === 'undefined') return INITIAL_INCIDENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INCIDENTS);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading incidents from localStorage', err);
  }
  return INITIAL_INCIDENTS;
}

export function saveStoredIncidents(incidents) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(incidents));
  } catch (err) {
    console.error('Failed saving incidents to localStorage', err);
  }
}

export function getStoredAudits() {
  if (typeof window === 'undefined') return INITIAL_AUDIT_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDITS);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading audits from localStorage', err);
  }
  return INITIAL_AUDIT_LOGS;
}

export function saveStoredAudits(audits) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_AUDITS, JSON.stringify(audits));
  } catch (err) {
    console.error('Failed saving audits to localStorage', err);
  }
}

/**
 * Ingests a new report into local simulated pipeline
 * Implements Duplicate clustering, Rule-based flagging, and Priority scoring
 */
export function submitReportLocally(payload) {
  const incidents = getStoredIncidents();
  const audits = getStoredAudits();

  const nowISO = new Date().toISOString();
  const reportedAt = payload.reported_at || nowISO;

  // 1. Heuristic NLP extraction
  const desc = (payload.description || '').toLowerCase();
  let hazardType = 'FLOOD';
  if (/fire|smoke|blaze|flame|transformer/i.test(desc)) hazardType = 'FIRE';
  else if (/landslide|rockfall|boulder|mudslide|debris/i.test(desc)) hazardType = 'LANDSLIDE';
  else if (/cyclone|storm|wind|gale/i.test(desc)) hazardType = 'CYCLONE';
  else if (/earthquake|tremor|quake|collapse/i.test(desc)) hazardType = 'EARTHQUAKE';

  const lifeSafetyCues = [];
  if (/trap|stuck|stranded/i.test(desc)) lifeSafetyCues.push('trapped');
  if (/injur|bleed|hurt|casualt/i.test(desc)) lifeSafetyCues.push('injured');
  if (/child|baby|elder|old/i.test(desc)) lifeSafetyCues.push('elderly/child');
  if (/medic|hospital|doctor/i.test(desc)) lifeSafetyCues.push('medical need');

  const freshness = calculateFreshness(reportedAt, hazardType, nowISO);

  // 2. Deterministic Rule-based flag detection
  const detectedFlags = [];

  // Incomplete check
  if (!payload.location_text || !payload.lat || !payload.lon) {
    detectedFlags.push({
      id: `flg-${Date.now()}-1`,
      code: 'INCOMPLETE',
      title: 'Incomplete Coordinates Fix',
      message: 'Report is missing precise GPS pin or street location text.',
      evidence: ['Missing verified geolocation coordinates'],
      state: 'ACTIVE',
    });
  }

  // Missing source check
  if (!payload.source_detail || payload.source_detail.trim().length < 4 || payload.source_type === 'UNKNOWN') {
    detectedFlags.push({
      id: `flg-${Date.now()}-2`,
      code: 'MISSING_SOURCE',
      title: 'Unverified Attribution Source',
      message: 'Source lacks contact phone verification or responder badge ID.',
      evidence: [`Source: ${payload.source_type}`, `Detail: "${payload.source_detail || 'None'}"`],
      state: 'ACTIVE',
    });
  }

  // Outdated check
  if (freshness === 'OUTDATED') {
    detectedFlags.push({
      id: `flg-${Date.now()}-3`,
      code: 'OUTDATED',
      title: 'Information Staleness Detected',
      message: `Report timestamp is older than the freshness limit for ${hazardType}.`,
      evidence: [`Reported at: ${reportedAt}`, `Status: OUTDATED`],
      state: 'ACTIVE',
    });
  }

  // Advisory Conflict check
  const activeAdvisories = INITIAL_ADVISORIES.filter((a) => a.hazard_type === hazardType);
  for (const adv of activeAdvisories) {
    const distToAdv = calculateDistanceKm(payload.lat, payload.lon, adv.center_lat, adv.center_lon);
    if (distToAdv <= adv.radius_km) {
      if (/open|clear|safe|passable/i.test(desc) && /closed|blocked|evacuation/i.test(adv.text.toLowerCase())) {
        detectedFlags.push({
          id: `flg-${Date.now()}-4`,
          code: 'ADVISORY_CONFLICT',
          title: 'Direct Advisory Contradiction',
          message: `Citizen asserts area/bridge is OPEN/SAFE, but Official Advisory "${adv.title}" states it is CLOSED.`,
          evidence: [`Citizen claim: "${payload.description}"`, `Official Advisory: "${adv.text}"`],
          state: 'ACTIVE',
        });
      }
    }
  }

  // 3. Cluster Matcher (Section 11.1 of Blueprint)
  let matchedCluster = null;
  let minDistance = 999;

  for (const cluster of incidents) {
    if (cluster.hazard_type === hazardType && cluster.status !== 'RESOLVED') {
      const dist = calculateDistanceKm(payload.lat, payload.lon, cluster.centroid_lat, cluster.centroid_lon);
      if (dist <= 3.0 && dist < minDistance) {
        minDistance = dist;
        matchedCluster = cluster;
      }
    }
  }

  const reportId = `rep-${Date.now().toString().slice(-5)}`;
  const newReport = {
    id: reportId,
    incident_id: matchedCluster ? matchedCluster.id : null,
    reported_at: reportedAt,
    received_at: nowISO,
    description: payload.description,
    location_text: payload.location_text,
    lat: payload.lat,
    lon: payload.lon,
    source_type: payload.source_type,
    source_detail: payload.source_detail,
    reported_severity: payload.reported_severity,
    evidence_url: payload.evidence_url || null,
    freshness,
    is_synthetic: true,
    extracted: {
      hazard_type: hazardType,
      place_mentions: [payload.location_text],
      claims: [{ entity: payload.location_text, state: payload.reported_severity }],
      life_safety_cues: lifeSafetyCues,
      language: 'English',
    },
    flags: detectedFlags,
  };

  let targetCluster;
  let isNew = false;

  if (matchedCluster) {
    // Add to existing incident cluster
    newReport.incident_id = matchedCluster.id;
    matchedCluster.reports.unshift(newReport);
    matchedCluster.report_count = matchedCluster.reports.length;
    matchedCluster.last_reported_at = reportedAt;

    detectedFlags.forEach((f) => {
      if (!matchedCluster.flags.some((ex) => ex.code === f.code && ex.state === 'ACTIVE')) {
        matchedCluster.flags.push(f);
      }
    });

    const activeCodes = matchedCluster.flags.filter((f) => f.state === 'ACTIVE').map((f) => f.code);
    const scoreResult = computeClusterScore(matchedCluster.reports, activeCodes);
    matchedCluster.priority_score = scoreResult.score;
    matchedCluster.priority_level = scoreResult.level;
    matchedCluster.freshness = scoreResult.freshness;
    matchedCluster.score_breakdown = scoreResult.breakdown;

    targetCluster = matchedCluster;
  } else {
    // Create new incident cluster
    isNew = true;
    const newClusterId = `inc-${(incidents.length + 1).toString().padStart(3, '0')}`;
    newReport.incident_id = newClusterId;

    const activeCodes = detectedFlags.map((f) => f.code);
    const scoreResult = computeClusterScore([newReport], activeCodes);

    targetCluster = {
      id: newClusterId,
      title: `${hazardType.charAt(0) + hazardType.slice(1).toLowerCase()} Inundation / Emergency at ${payload.location_text}`,
      hazard_type: hazardType,
      centroid_lat: payload.lat,
      centroid_lon: payload.lon,
      location_name: payload.location_text,
      first_reported_at: reportedAt,
      last_reported_at: reportedAt,
      report_count: 1,
      reports: [newReport],
      freshness,
      priority_score: scoreResult.score,
      priority_level: scoreResult.level,
      score_breakdown: scoreResult.breakdown,
      flags: detectedFlags,
      advisories: activeAdvisories,
      status: 'PENDING',
    };

    incidents.unshift(targetCluster);
  }

  saveStoredIncidents(incidents);

  audits.unshift({
    id: `aud-${Date.now().toString().slice(-5)}`,
    incident_id: targetCluster.id,
    reviewer: 'Automated Ingest Pipeline',
    action: 'EDIT',
    notes: isNew
      ? `Initialized new cluster ${targetCluster.id} for location ${payload.location_text}`
      : `Grouped incoming report ${reportId} with existing cluster ${targetCluster.id}`,
    created_at: nowISO,
  });
  saveStoredAudits(audits);

  const explanation = isNew
    ? `Created new cluster ${targetCluster.id}. Priority Score is ${targetCluster.priority_score} (${targetCluster.priority_level}) computed deterministically from reported ${payload.reported_severity} severity.`
    : `Automatically grouped with existing cluster ${targetCluster.id} (${minDistance.toFixed(1)} km away). Corroboration score increased to ${targetCluster.score_breakdown.corroboration}.`;

  return {
    report: newReport,
    incident: targetCluster,
    is_new_incident: isNew,
    priority_score: targetCluster.priority_score,
    priority_level: targetCluster.priority_level,
    flags: detectedFlags,
    freshness,
    explanation,
  };
}

/**
 * React hook for consuming and updating store state
 */
export function useIncidentsStore() {
  const [incidents, setIncidents] = useState([]);
  const [audits, setAudits] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
  let cancelled = false;

  async function loadIncidents() {
    try {
      const data = await fetchIncidents();

      if (!cancelled && data && Array.isArray(data.items)) {
        setIncidents(data.items);
      } else if (!cancelled) {
        setIncidents(getStoredIncidents());
      }
    } catch (error) {
      console.error('Failed to load incidents from backend:', error);

      if (!cancelled) {
        setIncidents(getStoredIncidents());
      }
    } finally {
      if (!cancelled) {
        setAudits(getStoredAudits());
        setIsLoaded(true);
      }
    }
  }

  loadIncidents();

  return () => {
    cancelled = true;
  };
}, []);

  const refresh = () => {
    setIncidents(getStoredIncidents());
    setAudits(getStoredAudits());
  };

  const updateIncidentStatus = async (
  incidentId,
  action,
  notes,
  reviewerName = 'Duty Coordinator'
) => {
  const actionMap = {
    CONFIRM: 'CONFIRM',
    NEEDS_VERIFICATION: 'NEEDS_VERIFICATION',
    RESOLVE: 'RESOLVE',
    SPLIT: 'SPLIT',
  };

  const backendAction = actionMap[action];

  if (!backendAction) {
    throw new Error(`Unsupported action: ${action}`);
  }

  try {
    const result = await submitIncidentReview(incidentId, {
      action: backendAction,
      notes: notes || '',
      reviewer: reviewerName,
    });

    // Refresh only after the backend request succeeds.
    await refresh();

    return result;
  } catch (error) {
    console.error('Failed to submit incident review:', error);
    throw error;
  }
};

  const dismissFlag = (incidentId, flagId, reason, reviewerName = 'Duty Coordinator') => {
    const list = getStoredIncidents();
    const incident = list.find((i) => i.id === incidentId);
    if (!incident) return;

    const flag = incident.flags.find((f) => f.id === flagId);
    if (!flag) return;

    flag.state = 'DISMISSED';
    flag.dismissed_reason = reason;
    flag.dismissed_by = reviewerName;
    flag.dismissed_at = new Date().toISOString();

    const activeCodes = incident.flags.filter((f) => f.state === 'ACTIVE').map((f) => f.code);
    const scoreResult = computeClusterScore(incident.reports, activeCodes);
    incident.priority_score = scoreResult.score;
    incident.priority_level = scoreResult.level;
    incident.score_breakdown = scoreResult.breakdown;

    saveStoredIncidents(list);

    const auditList = getStoredAudits();
    auditList.unshift({
      id: `aud-${Date.now().toString().slice(-5)}`,
      incident_id: incidentId,
      reviewer: reviewerName,
      action: 'DISMISS_FLAG',
      notes: `Dismissed flag "${flag.title}". Reason: ${reason}`,
      created_at: new Date().toISOString(),
      details: { flag_code: flag.code, reason },
    });
    saveStoredAudits(auditList);
    refresh();
  };

  const resetToSeedData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_INCIDENTS);
      localStorage.removeItem(STORAGE_KEY_AUDITS);
    }
    setIncidents(INITIAL_INCIDENTS);
    setAudits(INITIAL_AUDIT_LOGS);
  };

  return {
    incidents,
    audits,
    isLoaded,
    refresh,
    updateIncidentStatus,
    dismissFlag,
    resetToSeedData,
  };
}
