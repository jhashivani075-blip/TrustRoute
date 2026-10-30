'use client';

import React from 'react';
import Link from 'next/link';
import { ListFilter, UploadCloud, PlusCircle } from 'lucide-react';
import IncidentsTable from '../../components/IncidentsTable';
import IncidentFilters from '../../components/IncidentFilters';
import BulkUploadModal from '../../components/BulkUploadModal';
import { useIncidentsStore } from '../../lib/store';
import '../../styles/incidents.css';

export default function IncidentsQueuePage() {
  const { incidents, refresh } = useIncidentsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [hazardFilter, setHazardFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [freshnessFilter, setFreshnessFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const handleResetFilters = () => {
    setSearchQuery('');
    setHazardFilter('');
    setPriorityFilter('');
    setFreshnessFilter('');
    setStatusFilter('');
  };

  // Filter incidents in memory
  const filteredIncidents = incidents.filter((inc) => {
    if (hazardFilter && inc.hazard_type !== hazardFilter) return false;
    if (priorityFilter && inc.priority_level !== priorityFilter) return false;
    if (freshnessFilter && inc.freshness !== freshnessFilter) return false;
    if (statusFilter && inc.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (inc.title || '').toLowerCase().includes(q);
      const matchLoc = (inc.location_name || '').toLowerCase().includes(q);
      const matchId = (inc.id || '').toLowerCase().includes(q);
      if (!matchTitle && !matchLoc && !matchId) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Queue Header */}
      <div className="queue-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ListFilter size={26} color="var(--accent-blue)" />
            Incident Review Queue & Triage Matrix
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Multi-source corroborated cluster queue. Filter by hazard, staleness window, and evidence flags.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsBulkModalOpen(true)}
          >
            <UploadCloud size={16} />
            <span>Bulk CSV Ingestion</span>
          </button>

          <Link href="/submit" className="btn btn-primary btn-sm">
            <PlusCircle size={16} />
            <span>Add Single Report</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <IncidentFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        hazardFilter={hazardFilter}
        setHazardFilter={setHazardFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        freshnessFilter={freshnessFilter}
        setFreshnessFilter={setFreshnessFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onReset={handleResetFilters}
        totalResults={filteredIncidents.length}
      />

      {/* Incidents Table Card */}
      <div className="card">
        <IncidentsTable incidents={filteredIncidents} showHeader={true} />
      </div>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onUploadComplete={() => {
          refresh();
        }}
      />
    </div>
  );
}
