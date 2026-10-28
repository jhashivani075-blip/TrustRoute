'use client';

import React from 'react';
import { Search, RotateCcw } from 'lucide-react';

export default function IncidentFilters({
  searchQuery,
  setSearchQuery,
  hazardFilter,
  setHazardFilter,
  priorityFilter,
  setPriorityFilter,
  freshnessFilter,
  setFreshnessFilter,
  statusFilter,
  setStatusFilter,
  onReset,
  totalResults,
}) {
  return (
    <div className="filter-toolbar">
      <div className="search-box">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          className="form-input search-input"
          placeholder="Search by incident title, ward, or street..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <select
        className="form-select filter-select"
        value={hazardFilter}
        onChange={(e) => setHazardFilter(e.target.value)}
      >
        <option value="">All Hazards</option>
        <option value="FLOOD">Flood</option>
        <option value="LANDSLIDE">Landslide</option>
        <option value="FIRE">Fire</option>
        <option value="CYCLONE">Cyclone</option>
        <option value="EARTHQUAKE">Earthquake</option>
      </select>

      <select
        className="form-select filter-select"
        value={priorityFilter}
        onChange={(e) => setPriorityFilter(e.target.value)}
      >
        <option value="">All Priorities</option>
        <option value="HIGH">High Priority (70-100)</option>
        <option value="MEDIUM">Medium Priority (40-69)</option>
        <option value="LOW">Low Priority (0-39)</option>
      </select>

      <select
        className="form-select filter-select"
        value={freshnessFilter}
        onChange={(e) => setFreshnessFilter(e.target.value)}
      >
        <option value="">All Freshness</option>
        <option value="FRESH">Fresh</option>
        <option value="AGING">Aging</option>
        <option value="OUTDATED">Outdated</option>
      </select>

      <select
        className="form-select filter-select"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="">All Statuses</option>
        <option value="PENDING">Pending Review</option>
        <option value="REVIEWED">Confirmed / Reviewed</option>
        <option value="NEEDS_VERIFICATION">Needs Verification</option>
        <option value="RESOLVED">Resolved</option>
      </select>

      <button className="btn btn-outline btn-sm" onClick={onReset} title="Reset all filters">
        <RotateCcw size={14} />
      </button>

      <div className="filter-stats">
        <span>Showing <strong>{totalResults}</strong> clusters</span>
      </div>
    </div>
  );
}
