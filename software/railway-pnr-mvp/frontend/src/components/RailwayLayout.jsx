import React from 'react';
import { NavLink } from 'react-router-dom';
import Layout from './Layout.jsx';

const TABS = [
  { to: '/railway', label: 'Overview', end: true },
  { to: '/railway/passengers', label: 'Passengers' },
  { to: '/railway/linen', label: 'Linen Tracking' },
  { to: '/railway/incidents', label: 'Missing & Alerts' },
  { to: '/railway/blacklist', label: 'Blacklist' },
  { to: '/railway/reports', label: 'Reports' },
  { to: '/railway/audit', label: 'Audit Log' },
];

export default function RailwayLayout({ children }) {
  return (
    <Layout>
      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-4">
          <h1 className="font-display text-2xl text-rail-100">Railway Operations</h1>
          <span className="text-[11px] uppercase tracking-[0.15em] text-rail-500">
            Monitoring &amp; oversight — read-only over linen inventory
          </span>
        </div>
        <nav className="flex flex-wrap gap-1.5 border-b border-rail-800 pb-4">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `text-xs uppercase tracking-[0.1em] px-3 py-1.5 rounded transition-colors ${
                  isActive
                    ? 'bg-signal-amber/20 text-signal-amber'
                    : 'text-rail-400 hover:text-rail-200 hover:bg-rail-800/50'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
      {children}
    </Layout>
  );
}
