import React, { useEffect, useState } from 'react';
import RailwayLayout from '../../components/RailwayLayout.jsx';
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

export default function LinenTracking() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    client
      .get(`/railway/linen?${params.toString()}`)
      .then((res) => setItems(res.data.items))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <RailwayLayout>
      <h2 className="font-display text-xl text-rail-100 mb-4">Linen tracking</h2>

      <div className="flex flex-wrap gap-2 mb-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="flex gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search LID, QR, or PNR…"
            className="bg-rail-950 border border-rail-700 rounded px-3 py-1.5 text-sm pnr-digits text-rail-100 focus:outline-none focus:border-brass-400 w-64"
          />
          <button className="px-3 py-1.5 rounded border border-rail-600 text-xs hover:border-brass-400 hover:text-brass-400 transition-colors">
            Search
          </button>
        </form>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
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
      ) : (
        <div className="border border-rail-700/70 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-rail-800/80 text-left text-[11px] uppercase tracking-[0.12em] text-rail-400">
                <th className="px-4 py-2.5 font-medium">LID</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Assigned PNR</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it._id} className={`${i % 2 === 0 ? 'bg-rail-900/40' : 'bg-rail-900/10'} border-t border-rail-800`}>
                  <td className="px-4 py-2.5 pnr-digits text-brass-400">{it.lid}</td>
                  <td className="px-4 py-2.5 text-rail-200">{it.itemType}</td>
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
    </RailwayLayout>
  );
}
