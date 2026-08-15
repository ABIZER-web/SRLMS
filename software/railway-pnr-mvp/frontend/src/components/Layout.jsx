import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_LABEL = {
  admin: 'Administrator',
  coach_attendant: 'Coach Attendant',
  passenger: 'Passenger',
  linen_operator: 'Linen Operator',
  railway_officer: 'Railway Officer',
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-rail-700/60 bg-rail-900/70 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-xl text-brass-400 tracking-tight">PNR Coach Ledger</span>
            <span className="hidden sm:inline text-[11px] uppercase tracking-[0.2em] text-rail-400">
              Manifest &amp; boarding register
            </span>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <div className="text-right leading-tight">
                <div className="text-sm text-rail-100">{user.name}</div>
                <div className="text-[11px] uppercase tracking-[0.15em] text-brass-400">
                  {ROLE_LABEL[user.role]}
                  {user.assignedCoachNumber ? ` · Coach ${user.assignedCoachNumber}` : ''}
                </div>
              </div>
              <button
                onClick={logout}
                className="text-xs uppercase tracking-[0.15em] px-3 py-1.5 rounded border border-rail-600 text-rail-200 hover:border-brass-400 hover:text-brass-400 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
