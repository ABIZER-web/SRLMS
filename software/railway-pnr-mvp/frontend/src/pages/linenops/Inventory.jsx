import React, { useEffect, useState } from 'react';
import LinenOpsLayout from '../../components/LinenOpsLayout.jsx';
import client from '../../api/client';

const STATUS_TONE = {
  available: 'text-signal-green',
  in_kit: 'text-rail-300',
  assigned: 'text-signal-amber',
  in_use: 'text-signal-amber',
  returned: 'text-rail-400',
  in_laundry: 'text-rail-400',
  missing: 'text-signal-red',
  retired: 'text-rail-600',
};

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : '';
    client
      .get(`/linen-ops/items${params}`)
      .then((res) => setItems(res.data.items))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <LinenOpsLayout>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-xl text-rail-100">Linen inventory</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-rail-950 border border-rail-700 rounded px-3 py-1.5 text-xs text-rail-200 focus:outline-none focus:border-brass-400"
        >
          <option value="">All statuses</option>
          {Object.keys(STATUS_TONE).map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-rail-400 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-rail-500 text-sm">No items match this filter.</div>
      ) : (
        <div className="border border-rail-700/70 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-rail-800/80 text-left text-[11px] uppercase tracking-[0.12em] text-rail-400">
                <th className="px-4 py-2.5 font-medium">LID</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">QR code</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Assigned PNR</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr
                  key={it._id}
                  className={`${i % 2 === 0 ? 'bg-rail-900/40' : 'bg-rail-900/10'} border-t border-rail-800`}
                >
                  <td className="px-4 py-2.5 pnr-digits text-brass-400">{it.lid}</td>
                  <td className="px-4 py-2.5 text-rail-200">{it.itemType}</td>
                  <td className="px-4 py-2.5 pnr-digits text-rail-400 text-xs">{it.qrCode}</td>
                  <td className={`px-4 py-2.5 ${STATUS_TONE[it.status] || 'text-rail-300'}`}>
                    {it.status.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-2.5 pnr-digits text-rail-400 text-xs">{it.assignedPnr || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </LinenOpsLayout>
  );
}
