import React, { useEffect, useState } from 'react';
import client from '../api/client';

export default function GateAlertPanel() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lid, setLid] = useState('');
  const [gateId, setGateId] = useState('EXIT-GATE-1');
  const [simResult, setSimResult] = useState('');
  const [simBusy, setSimBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await client.get('/gates/alerts');
      setIncidents(res.data.incidents);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function simulateScan(e) {
    e.preventDefault();
    setSimResult('');
    setSimBusy(true);
    try {
      const res = await client.post('/gates/scan', { lid: lid.trim(), gateId: gateId.trim() });
      setSimResult(res.data.message);
      if (res.data.flagged) load();
    } catch (err) {
      setSimResult(err?.response?.data?.message || 'Scan failed');
    } finally {
      setSimBusy(false);
    }
  }

  async function resolve(id) {
    await client.patch(`/gates/alerts/${id}/resolve`);
    load();
  }

  const openCount = incidents.filter((i) => i.status === 'open').length;

  return (
    <div className="border border-rail-700/70 rounded-lg bg-rail-900/50 p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="font-display text-lg text-rail-100">Exit gate alerts</h2>
        <span className={`text-sm ${openCount > 0 ? 'text-signal-red' : 'text-rail-400'}`}>
          {openCount} open
        </span>
      </div>
      <p className="text-rail-400 text-xs mb-4">
        No physical gate reader yet — this simulates a station exit-gate RFID/AM scan. Any item still
        marked "assigned" (never returned) that passes a gate is flagged here.
      </p>

      <form onSubmit={simulateScan} className="flex flex-wrap gap-2 mb-5 items-end">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.12em] text-rail-500 mb-1">
            Item LID
          </label>
          <input
            value={lid}
            onChange={(e) => setLid(e.target.value)}
            placeholder="e.g. 8491524340"
            className="bg-rail-950 border border-rail-700 rounded px-3 py-1.5 text-sm pnr-digits text-rail-100 focus:outline-none focus:border-brass-400 w-48"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.12em] text-rail-500 mb-1">Gate</label>
          <input
            value={gateId}
            onChange={(e) => setGateId(e.target.value)}
            className="bg-rail-950 border border-rail-700 rounded px-3 py-1.5 text-sm text-rail-100 focus:outline-none focus:border-brass-400 w-36"
          />
        </div>
        <button
          disabled={!lid.trim() || simBusy}
          className="px-4 py-1.5 rounded border border-rail-600 text-xs hover:border-brass-400 hover:text-brass-400 transition-colors disabled:opacity-40"
        >
          {simBusy ? 'Scanning…' : 'Simulate gate scan'}
        </button>
      </form>
      {simResult && <div className="text-xs text-rail-300 mb-4">{simResult}</div>}

      {loading ? (
        <div className="text-rail-400 text-sm">Loading alerts…</div>
      ) : incidents.length === 0 ? (
        <div className="text-rail-500 text-sm">No exit-gate incidents recorded.</div>
      ) : (
        <div className="space-y-2">
          {incidents.map((inc) => (
            <div
              key={inc._id}
              className={`flex items-center justify-between px-3 py-2 rounded border text-sm ${
                inc.status === 'open'
                  ? 'border-signal-red/40 bg-signal-red/10'
                  : 'border-rail-700 bg-rail-900/30 opacity-60'
              }`}
            >
              <div>
                <span className="pnr-digits text-brass-400 mr-2">{inc.lid}</span>
                <span className="text-rail-200">{inc.itemType}</span>
                {inc.pnr && (
                  <span className="text-rail-400">
                    {' '}
                    — PNR <span className="pnr-digits">{inc.pnr}</span>
                    {inc.passengerName ? ` (${inc.passengerName}, Coach ${inc.coachNumber})` : ''}
                  </span>
                )}
                <span className="text-rail-500 text-xs block">
                  {inc.gateId} · {new Date(inc.detectedAt).toLocaleString()}
                </span>
              </div>
              {inc.status === 'open' ? (
                <button
                  onClick={() => resolve(inc._id)}
                  className="text-xs px-2.5 py-1 rounded border border-rail-600 hover:border-brass-400 hover:text-brass-400 transition-colors"
                >
                  Resolve
                </button>
              ) : (
                <span className="text-[11px] uppercase tracking-[0.1em] text-rail-500">Resolved</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
