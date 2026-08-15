import React from 'react';
import { NavLink } from 'react-router-dom';
import Layout from './Layout.jsx';

const TABS = [
  { to: '/linen-ops', label: 'Dashboard', end: true },
  { to: '/linen-ops/create-kit', label: 'Create New Kit' },
  { to: '/linen-ops/register-pillow', label: 'Register Pillow' },
  { to: '/linen-ops/scan', label: 'Scan / Find' },
  { to: '/linen-ops/inventory', label: 'Inventory' },
  { to: '/linen-ops/kits', label: 'Kits' },
];

export default function LinenOpsLayout({ children }) {
  return (
    <Layout>
      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-4">
          <h1 className="font-display text-2xl text-rail-100">Linen Management</h1>
          <span className="text-[11px] uppercase tracking-[0.15em] text-rail-500">
            Private contractor dashboard
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
                    ? 'bg-brass-500/20 text-brass-400'
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
