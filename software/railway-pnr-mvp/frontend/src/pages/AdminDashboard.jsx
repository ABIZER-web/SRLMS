import React, { useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import Layout from '../components/Layout.jsx';
import PnrTable from '../components/PnrTable.jsx';
import GateAlertPanel from '../components/GateAlertPanel.jsx';

export default function AdminDashboard() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [coachFilter, setCoachFilter] = useState('all');

  useEffect(() => {
    client
      .get('/pnr')
      .then((res) => setRecords(res.data.records))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load records'))
      .finally(() => setLoading(false));
  }, []);

  const coaches = useMemo(() => [...new Set(records.map((r) => r.coachNumber))].sort(), [records]);
  const filtered = coachFilter === 'all' ? records : records.filter((r) => r.coachNumber === coachFilter);

  return (
    <Layout>
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="font-display text-2xl text-rail-100">Full train manifest</h1>
        <span className="text-sm text-rail-400">{filtered.length} of {records.length} PNRs</span>
      </div>
      <p className="text-rail-400 text-sm mb-6">
        Every seeded PNR across all coaches, exactly as it would already exist in IRCTC once a
        passenger books.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setCoachFilter('all')}
          className={`text-xs uppercase tracking-[0.12em] px-3 py-1.5 rounded border transition-colors ${
            coachFilter === 'all'
              ? 'border-brass-400 text-brass-400 bg-brass-500/10'
              : 'border-rail-700 text-rail-300 hover:border-rail-500'
          }`}
        >
          All coaches
        </button>
        {coaches.map((c) => (
          <button
            key={c}
            onClick={() => setCoachFilter(c)}
            className={`text-xs uppercase tracking-[0.12em] px-3 py-1.5 rounded border transition-colors ${
              coachFilter === c
                ? 'border-brass-400 text-brass-400 bg-brass-500/10'
                : 'border-rail-700 text-rail-300 hover:border-rail-500'
            }`}
          >
            Coach {c}
          </button>
        ))}
      </div>

      <div className="ledger-rule mb-6" />

      {loading && <div className="text-rail-400 text-sm">Loading…</div>}
      {error && <div className="text-signal-red text-sm">{error}</div>}
      {!loading && !error && <PnrTable records={filtered} />}

      <div className="mt-8">
        <GateAlertPanel />
      </div>
    </Layout>
  );
}
