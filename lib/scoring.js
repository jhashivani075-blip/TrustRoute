/**
 * Scoring and Freshness engine for TrustRoute
 * Follows TrustRoute Technical Blueprint Section 11 & 13
 */

/**
 * Calculates freshness status based on hazard-specific time windows
 * @param {string} reportedAtISO 
 * @param {string} hazardType 
 * @param {string} referenceTimeISO 
 * @returns {'FRESH' | 'AGING' | 'OUTDATED'}
 */
export function calculateFreshness(reportedAtISO, hazardType = 'FLOOD', referenceTimeISO = new Date().toISOString()) {
  const reportedTime = new Date(reportedAtISO).getTime();
  const refTime = new Date(referenceTimeISO).getTime();
  const ageHours = Math.max(0, (refTime - reportedTime) / (1000 * 60 * 60));

  // Hazard specific windows from Blueprint Section 11.2
  switch (hazardType) {
    case 'FIRE':
      if (ageHours <= 1) return 'FRESH';
      if (ageHours <= 2) return 'AGING';
      return 'OUTDATED';
    case 'EARTHQUAKE':
    case 'BUILDING_COLLAPSE':
      if (ageHours <= 2) return 'FRESH';
      if (ageHours <= 4) return 'AGING';
      return 'OUTDATED';
    case 'FLOOD':
      if (ageHours <= 3) return 'FRESH';
      if (ageHours <= 6) return 'AGING';
      return 'OUTDATED';
    case 'LANDSLIDE':
      if (ageHours <= 4) return 'FRESH';
      if (ageHours <= 8) return 'AGING';
      return 'OUTDATED';
    case 'CYCLONE':
      if (ageHours <= 6) return 'FRESH';
      if (ageHours <= 12) return 'AGING';
      return 'OUTDATED';
    default:
      if (ageHours <= 3) return 'FRESH';
      if (ageHours <= 6) return 'AGING';
      return 'OUTDATED';
  }
}

/**
 * Computes deterministic cluster review priority
 * Formula: Priority = min(100, (Urgency x FreshnessFactor) + Corroboration + ConflictAttention)
 * @param {Array} reports
 * @param {Array<string>} activeFlagCodes
 * @returns {{ score: number, level: 'HIGH'|'MEDIUM'|'LOW', breakdown: object, freshness: string }}
 */
export function computeClusterScore(reports = [], activeFlagCodes = []) {
  if (!reports || reports.length === 0) {
    return {
      score: 0,
      level: 'LOW',
      freshness: 'FRESH',
      breakdown: { urgency: 0, freshness_factor: 1.0, corroboration: 0, conflict_attention: 0, total: 0 },
    };
  }

  // 1. Urgency: Highest base severity in cluster
  const severityScores = {
    CRITICAL: 70,
    HIGH: 50,
    MEDIUM: 30,
    LOW: 10,
  };

  let maxBaseSeverity = 10;
  reports.forEach((r) => {
    const s = severityScores[r.reported_severity] || 10;
    if (s > maxBaseSeverity) maxBaseSeverity = s;
  });

  // Extract life safety cues across reports (capped at +30)
  let cueBonus = 0;
  const allDescriptions = reports.map((r) => r.description || '').join(' ').toLowerCase();

  if (/trap|stuck|stranded|collapse|surround|roof/i.test(allDescriptions)) cueBonus += 15;
  if (/injur|bleed|hurt|casualt|burn/i.test(allDescriptions)) cueBonus += 10;
  if (/child|baby|infant|elder|old|grand/i.test(allDescriptions)) cueBonus += 5;
  if (/medic|oxygen|doctor|hospital|ambulance/i.test(allDescriptions)) cueBonus += 5;

  const totalCueBonus = Math.min(30, cueBonus);
  const urgency = Math.min(100, maxBaseSeverity + totalCueBonus);

  // 2. Freshness factor: best freshness in cluster
  const freshnessRanks = { FRESH: 3, AGING: 2, OUTDATED: 1 };
  let bestFreshness = 'OUTDATED';
  reports.forEach((r) => {
    const currentRank = freshnessRanks[r.freshness] || 1;
    const bestRank = freshnessRanks[bestFreshness] || 1;
    if (currentRank > bestRank) {
      bestFreshness = r.freshness;
    }
  });

  const freshnessFactorMap = {
    FRESH: 1.0,
    AGING: 0.7,
    OUTDATED: 0.4,
  };
  const freshnessFactor = freshnessFactorMap[bestFreshness] || 0.7;

  // 3. Corroboration: +5 for each distinct independent source beyond the first, cap 15
  const uniqueSources = new Set();
  reports.forEach((r) => {
    const key = `${r.source_type || 'UNKNOWN'}::${(r.source_detail || '').trim().toLowerCase()}`;
    uniqueSources.add(key);
  });
  const independentCount = uniqueSources.size;
  const corroboration = Math.min(15, Math.max(0, (independentCount - 1) * 5));

  // 4. Conflict Attention: +10 if active advisory or location conflict AND urgency >= 50
  const hasConflict = activeFlagCodes.includes('ADVISORY_CONFLICT') || activeFlagCodes.includes('LOCATION_CONFLICT');
  const conflictAttention = (hasConflict && urgency >= 50) ? 10 : 0;

  // Priority formula
  const total = Math.min(100, Math.round((urgency * freshnessFactor) + corroboration + conflictAttention));

  let level = 'LOW';
  if (total >= 70) level = 'HIGH';
  else if (total >= 40) level = 'MEDIUM';

  return {
    score: total,
    level,
    freshness: bestFreshness,
    breakdown: {
      urgency,
      freshness_factor: freshnessFactor,
      corroboration,
      conflict_attention: conflictAttention,
      total,
      details: {
        base_severity: maxBaseSeverity,
        safety_cue_bonus: totalCueBonus,
        independent_sources: independentCount,
        conflict_reason: hasConflict ? 'Active Location or Advisory conflict with High Urgency' : null,
      },
    },
  };
}
