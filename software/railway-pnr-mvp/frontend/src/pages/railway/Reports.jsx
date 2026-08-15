import React, { useState } from 'react';
import RailwayLayout from '../../components/RailwayLayout.jsx';
import client from '../../api/client';

const REPORTS = [
  { type: 'linen-inventory', label: 'Linen inventory', desc: 'Every registered item, its status, and current PNR assignment.' },
  { type: 'missing-linen', label: 'Missing linen', desc: 'All exit-gate incidents — LID, passenger, coach, gate, status.' },
  { type: 'blacklist', label: 'Blacklist', desc: 'Every blacklist record and its review history.' },
  { type: 'audit', label: 'Audit log', desc: 'Full action history — actor, role, action, entity, result.' },
  { type: 'passengers', label: 'Passengers', desc: 'All PNR bookings with linen assign/return status.' },
];

export default function Reports() {
  const [downloading, setDownloading] = useState(null);

  async function download(type) {
    setDownloading(type);
    try {
      const res = await client.get(`/railway/reports/${type}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <RailwayLayout>
      <h2 className="font-display text-xl text-rail-100 mb-1">Reports</h2>
      <p className="text-rail-400 text-xs mb-5">Export as CSV. Every export is logged in the audit trail.</p>

      <div className="grid sm:grid-cols-2 gap-3">
        {REPORTS.map((r) => (
          <div key={r.type} className="border border-rail-700/70 rounded-lg bg-rail-900/50 p-4">
            <div className="text-rail-100 font-medium mb-1">{r.label}</div>
            <div className="text-rail-400 text-xs mb-3">{r.desc}</div>
            <button
              onClick={() => download(r.type)}
              disabled={downloading === r.type}
              className="text-xs px-3 py-1.5 rounded bg-brass-500 text-rail-950 font-medium hover:bg-brass-400 transition-colors disabled:opacity-50"
            >
              {downloading === r.type ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        ))}
      </div>
    </RailwayLayout>
  );
}
