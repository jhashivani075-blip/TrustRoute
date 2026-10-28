'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  LayoutDashboard,
  ListFilter,
  PlusCircle,
  FileText,
  Activity,
} from 'lucide-react';

export default function DashboardSidebar() {
  const pathname = usePathname();

  const links = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Incidents', href: '/incidents', icon: ListFilter },
    { label: 'Submit Report', href: '/submit', icon: PlusCircle },
    { label: 'Audit Log', href: '/incidents#audit', icon: FileText },
  ];

  return (
    <aside className="dash-sidebar">
      {/* Brand Header */}
      <Link href="/" className="dash-sidebar-header">
        <div className="sidebar-brand-icon">
          <ShieldAlert size={22} />
        </div>
        <div className="sidebar-brand-text">
          <div className="sidebar-brand-title">
            Trust<span>Route</span>
          </div>
          <div className="sidebar-brand-tagline">Disaster Verification</div>
        </div>
      </Link>

      {/* Nav Menu */}
      <nav className="dash-sidebar-nav">
        {links.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`dash-sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="dash-sidebar-footer">
        <div className="system-status-pill">
          <div className="status-indicator-green" />
          <span>System Online</span>
        </div>
      </div>
    </aside>
  );
}
