import React, { useEffect, useState } from 'react';
import LinenOpsLayout from '../../components/LinenOpsLayout.jsx';
import client from '../../api/client';

function Stat({ label, value, tone = 'text-rail-100' }) {
  return (
    <div className="border border-rail-700/70 rounded-lg bg-rail-900/50 px-5 py-4">
      <div className={`font-display text-3xl ${tone}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-[0.15em] text-rail-500 mt-1">{label}</div>
    </div>
  );
}

export default function LinenOpsDashboard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    client.get('/linen-ops/summary').then((res) => setSummary(res.data));
  }, []);

  return (
    <LinenOpsLayout>
      <p className="text-rail-400 text-sm mb-6 max-w-2xl">
        This is the laundry contractor's own inventory system — separate from the railway's
        passenger/PNR dashboard. Register each physical linen item's RFID, group five into a kit,
        and print QR labels here. Coach attendants only ever scan the QR codes generated here.
      </p>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Stat label="Total items" value={summary.totalItems} />
          <Stat label="Total kits" value={summary.totalKits} />
          <Stat label="Sealed kits" value={summary.sealedKits} tone="text-signal-green" />
          <Stat label="Assigned kits" value={summary.assignedKits} tone="text-signal-amber" />
        </div>
      )}

      {summary && (
        <div className="border border-rail-700/70 rounded-lg bg-rail-900/50 p-5">
          <h2 className="font-display text-lg text-rail-100 mb-3">Items by status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            {Object.entries(summary.statusCounts).map(([status, count]) => (
              <div key={status} className="flex justify-between border-b border-rail-800 pb-1.5">
                <span className="text-rail-400 capitalize">{status.replace('_', ' ')}</span>
                <span className="text-rail-100">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </LinenOpsLayout>
  );
}
