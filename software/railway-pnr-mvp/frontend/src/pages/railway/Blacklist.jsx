import React, { useEffect, useState } from 'react';
import RailwayLayout from '../../components/RailwayLayout.jsx';
import client from '../../api/client';

const TABS = ['under_review', 'active', 'rejected', 'resolved', 'all'];
const STATUS_TONE = {
  under_review: 'text-signal-amber',
  active: 'text-signal-red',
  rejected: 'text-rail-500',
  resolved: 'text-rail-500',
};

export default function Blacklist() {
  const [tab, setTab] = useState('under_review');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    client
      .get(`/railway/blacklist?status=${tab}`)
      .then((res) => setRecords(res.data.records))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function decide(id, decision) {
    setBusy(true);
    try {
      await client.patch(`/railway/blacklist/${id}/decision`, { decision });
      load();
    } finally {
      setBusy(false);
    }
  }

  async function resolve(id) {
    setBusy(true);
    try {
      await client.patch(`/railway/blacklist/${id}/resolve`);
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <RailwayLayout>
      <h2 className="font-display text-xl text-rail-100 mb-1">Blacklist management</h2>
      <p className="text-rail-400 text-xs mb-5 max-w-2xl">
        A controlled record, not a one-click ban. Records start "under review" — an officer has to
        approve before it becomes active, and every decision is logged in the audit trail.
      </p>

      <div className="flex gap-1.5 mb-5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-xs uppercase tracking-[0.1em] px-3 py-1.5 rounded border transition-colors ${
              tab === t
                ? 'border-brass-400 text-brass-400 bg-brass-500/10'
                : 'border-rail-700 text-rail-400 hover:border-rail-500'
            }`}
          >
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-rail-400 text-sm">Loading…</div>
      ) : records.length === 0 ? (
        <div className="text-rail-500 text-sm">No records in this view.</div>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div key={r._id} className="border border-rail-700/70 rounded-lg bg-rail-900/40 px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-3">
                  <span className="pnr-digits text-brass-400">{r.recordId}</span>
                  <span className="text-rail-200">{r.passengerName}</span>
                  {r.pnr && <span className="pnr-digits text-rail-500 text-xs">PNR {r.pnr}</span>}
                </span>
                <span className={`text-xs uppercase tracking-[0.1em] ${STATUS_TONE[r.status]}`}>{r.status}</span>
              </div>
              <div className="text-xs text-rail-400 mb-2">{r.reasonCategory}</div>
              <div className="text-[11px] text-rail-500 mb-3">
                Proposed by {r.createdByEmpId} · {new Date(r.createdAt).toLocaleString()}
                {r.reviewedByEmpId && ` · reviewed by ${r.reviewedByEmpId}`}
              </div>

              {r.status === 'under_review' && (
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() => decide(r._id, 'approve')}
                    className="text-xs px-3 py-1.5 rounded border border-signal-red/40 text-signal-red hover:bg-signal-red/10 transition-colors disabled:opacity-40"
                  >
                    Approve → active
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => decide(r._id, 'reject')}
                    className="text-xs px-3 py-1.5 rounded border border-rail-600 text-rail-300 hover:border-rail-400 transition-colors disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              )}
              {r.status === 'active' && (
                <button
                  disabled={busy}
                  onClick={() => resolve(r._id)}
                  className="text-xs px-3 py-1.5 rounded border border-signal-green/40 text-signal-green hover:bg-signal-green/10 transition-colors disabled:opacity-40"
                >
                  Resolve / clear
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </RailwayLayout>
  );
}
