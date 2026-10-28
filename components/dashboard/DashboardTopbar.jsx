'use client';

import React, { useState, useEffect } from 'react';
import { Search, Bell, Clock, AlertTriangle } from 'lucide-react';

export default function DashboardTopbar({ searchValue, onSearchChange }) {
  const [dateTimeStr, setDateTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const datePart = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const timePart = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setDateTimeStr(`${datePart} • ${timePart} IST`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="dash-topbar">
      {/* Search Input */}
      <div className="dash-search-container">
        <Search size={16} className="dash-search-icon" />
        <input
          type="text"
          className="dash-search-input"
          placeholder="Search incidents, locations, hazard types..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Right Actions */}
      <div className="dash-topbar-actions">
        {/* Simulation Indicator */}
        <div className="simulation-indicator-badge">
          <AlertTriangle size={12} color="#b45309" />
          <span>Simulation Data (Evaluation Mode)</span>
        </div>

        {/* Live Date/Time */}
        <div className="dash-clock">
          <Clock size={14} color="#64748b" />
          <span>{dateTimeStr}</span>
        </div>

        {/* Notification Bell */}
        <button
          className="dash-topbar-btn"
          title="3 Unread Coordinator Alerts"
          onClick={() => alert('Active Alerts:\n1. Location conflict on #INC-045 (Station Rd vs Ward 12)\n2. Contradiction on #INC-046 with SDMA Advisory\n3. High water velocity surge detected in Guwahati Ward 12')}
        >
          <Bell size={18} />
          <span className="unread-badge">3</span>
        </button>

        {/* Reviewer Avatar & Profile */}
        <div className="dash-user-profile">
          <div className="user-avatar-circle">SJ</div>
          <div className="user-info">
            <span className="user-name">Duty Coordinator</span>
            <span className="user-role">Control Room Lead</span>
          </div>
        </div>
      </div>
    </header>
  );
}
