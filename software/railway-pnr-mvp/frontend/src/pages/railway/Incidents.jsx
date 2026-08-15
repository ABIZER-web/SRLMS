import React, { useEffect, useState } from 'react';
import RailwayLayout from '../../components/RailwayLayout.jsx';
import client from '../../api/client';

const TABS = ['open', 'under_review', 'resolved', 'all'];
const STATUS_TONE = { open: 'text-signal-red', under_review: 'text-signal-amber', resolved: 'text-rail-500' };

export default function Incidents() {
  const [tab, setTab] = useState('open');
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  function load() {
    setLoading(true);
    client
      .get(`/railway/incidents?status=${tab}`)
      .then((res) => setIncidents(res.data.incidents))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    setExpanded(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function toggle(inc) {
    if (expanded === inc._id) {
      setExpanded(null);
      return;
    }
    setExpanded(inc._id);
    setDetail(null);
    const res = await client.get(`/railway/incidents/${inc._id}`);
    setDetail(res.data);
  }

  async function setStatus(id, status) {
    setBusy(true);
    try {
      await client.patch(`/railway/incidents/${id}/status`, { status, notes: note });
      setNote('');
      load();
      setExpanded(null);
    } finally {
      setBusy(false);
    }
  }

  async function proposeBlacklist(inc) {
    setBusy(true);
    try {
      await client.post('/railway/blacklist', {
        passengerName: inc.passengerName,
        pnr: inc.pnr,
        incidentId: inc._id,
      });
      alert(`Blacklist record proposed for ${inc.passengerName} — check the Blacklist tab to review it.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <RailwayLayout>
      <h2 className="font-display text-xl text-rail-100 mb-4">Missing &amp; alerts</h2>

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
      ) : incidents.length === 0 ? (
        <div className="text-rail-500 text-sm">No incidents in this view.</div>
      ) : (
        <div className="space-y-2">
          {incidents.map((inc) => (
            <div key={inc._id} className="border border-rail-700/70 rounded-lg bg-rail-900/40 overflow-hidden">
              <button
                onClick={() => toggle(inc)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-rail-800/40 transition-colors"
              >
                <span className="flex items-center gap-3">
                  <span className="pnr-digits text-brass-400">{inc.lid}</span>
                  <span className="text-rail-200">{inc.itemType}</span>
                  {inc.passengerName && <span className="text-rail-400 text-xs">— {inc.passengerName}</span>}
                </span>
                <span className={`text-xs uppercase tracking-[0.1em] ${STATUS_TONE[inc.status]}`}>{inc.status}</span>
              </button>

              {expanded === inc._id && detail && (
                <div className="px-4 pb-4 pt-1 border-t border-rail-800 text-sm space-y-3">
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
                    <Row label="Gate" value={inc.gateId} />
                    <Row label="Detected" value={new Date(inc.detectedAt).toLocaleString()} />
                    <Row label="PNR" value={inc.pnr || '—'} />
                    <Row label="Coach" value={inc.coachNumber || '—'} />
                  </div>

                  {detail.blacklist && (
                    <div className="border border-signal-amber/40 bg-signal-amber/10 rounded px-3 py-2 text-signal-amber text-xs">
                      Blacklist record {detail.blacklist.recordId} already exists ({detail.blacklist.status})
                    </div>
                  )}

                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional note…"
                    className="w-full bg-rail-950 border border-rail-700 rounded px-3 py-1.5 text-xs text-rail-100 focus:outline-none focus:border-brass-400"
                  />

                  <div className="flex flex-wrap gap-2">
                    {inc.status !== 'under_review' && (
                      <button
                        disabled={busy}
                        onClick={() => setStatus(inc._id, 'under_review')}
                        className="text-xs px-3 py-1.5 rounded border border-signal-amber/40 text-signal-amber hover:bg-signal-amber/10 transition-colors disabled:opacity-40"
                      >
                        Mark under review
                      </button>
                    )}
                    {inc.status !== 'resolved' && (
                      <button
                        disabled={busy}
                        onClick={() => setStatus(inc._id, 'resolved')}
                        className="text-xs px-3 py-1.5 rounded border border-signal-green/40 text-signal-green hover:bg-signal-green/10 transition-colors disabled:opacity-40"
                      >
                        Resolve
                      </button>
                    )}
                    {!detail.blacklist && inc.pnr && (
                      <button
                        disabled={busy}
                        onClick={() => proposeBlacklist(inc)}
                        className="text-xs px-3 py-1.5 rounded border border-signal-red/40 text-signal-red hover:bg-signal-red/10 transition-colors disabled:opacity-40"
                      >
                        Propose blacklist
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </RailwayLayout>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-rail-400">{label}</span>
      <span className="text-rail-100">{value}</span>
    </div>
  );
}
