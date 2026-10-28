'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldAlert, LayoutDashboard, ListFilter, PlusCircle, Activity, Radio } from 'lucide-react';
import '@/styles/navbar.css';

export default function Navbar() {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' IST'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { label: 'Overview', href: '/', icon: Activity },
    { label: 'Command Center', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Review Queue', href: '/incidents', icon: ListFilter },
    { label: 'Report Intake', href: '/submit', icon: PlusCircle },
  ];

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand">
          <div className="brand-icon">
            <ShieldAlert size={22} />
          </div>
          <div className="brand-title">
            Trust<span>Route</span>
          </div>
          <span className="brand-badge">Disaster Intel</span>
        </Link>

        <nav className="navbar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="navbar-right">
          <div className="telemetry-status">
            <div className="status-dot"></div>
            <span>SIMULATION FEED ACTIVE</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{currentTime}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
