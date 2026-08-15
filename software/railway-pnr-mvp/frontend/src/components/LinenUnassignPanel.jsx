import React, { useState } from 'react';
import client from '../api/client';

export default function LinenUnassignPanel({ onUnassigned }) {
  const [mode, setMode] = useState('quick'); // 'quick' | 'itemized'
  const [pnr, setPnr] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [scannedLids, setScannedLids] = useState([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);

  function addScan(e) {
    e.preventDefault();
    const lid = scanInput.trim();
    if (!lid) return;
    if (!scannedLids.includes(lid)) setScannedLids([...scannedLids, lid]);
    setScanInput('');
  }

  function removeScan(lid) {
    setScannedLids(scannedLids.filter((l) => l !== lid));
  }

  async function submitQuick(e) {
    e.preventDefault();
    setError('');
    setResult('');
    setBusy(true);
    try {
      const res = await client.post('/linen/unassign/quick', { pnr: pnr.trim() });
      setResult(res.data.message);
      setPnr('');
      if (onUnassigned) onUnassigned(res.data.pnrRecord);
    } catch (err) {
      setError(err?.response?.data?.message || 'Quick unassign failed');
    } finally {
      setBusy(false);
    }
  }

  async function submitItemized(e) {
    e.preventDefault();
    setError('');
    setResult('');
    setBusy(true);
    try {
      const res = await client.post('/linen/unassign/itemized', {
        pnr: pnr.trim(),
        scannedLids,
      });
      setResult(res.data.message);
      if (res.data.fullyReturned) {
        setPnr('');
        setScannedLids([]);
        if (onUnassigned) onUnassigned(res.data.pnrRecord);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Itemized unassign failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-rail-700/70 rounded-lg bg-rail-900/50 p-5">
      <h2 className="font-display text-lg text-rail-100 mb-1">Unassign linen</h2>
      <p className="text-rail-400 text-xs mb-4">
        The paper bag is already gone by return time, so items come back individually. Use itemized
        scanning when there's time to verify each piece, or quick unassign when there isn't.
      </p>

      <div className="flex rounded-lg border border-rail-700 overflow-hidden mb-4 w-fit">
        {['quick', 'itemized'].map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError('');
              setResult('');
            }}
            className={`px-4 py-1.5 text-xs uppercase tracking-[0.12em] transition-colors ${
              mode === m ? 'bg-brass-500/20 text-brass-400' : 'text-rail-400 hover:text-rail-200'
            }`}
          >
            {m === 'quick' ? 'Quick (PNR only)' : 'Itemized (scan all 6)'}
          </button>
        ))}
      </div>

      {mode === 'quick' && (
        <form onSubmit={submitQuick} className="flex gap-2 items-end max-w-md">
          <div className="flex-1">
            <label className="block text-[11px] uppercase tracking-[0.15em] text-rail-400 mb-1.5">
              PNR
            </label>
            <input
              value={pnr}
              onChange={(e) => setPnr(e.target.value)}
              placeholder="10-digit PNR"
              className="w-full bg-rail-950 border border-rail-700 rounded px-3 py-2 text-sm pnr-digits text-rail-100 focus:outline-none focus:border-brass-400"
            />
          </div>
          <button
            type="submit"
            disabled={!pnr.trim() || busy}
            className="px-5 py-2 rounded bg-brass-500 text-rail-950 text-sm font-medium hover:bg-brass-400 transition-colors disabled:opacity-40"
          >
            {busy ? 'Unassigning…' : 'Unassign'}
          </button>
        </form>
      )}

      {mode === 'itemized' && (
        <div className="space-y-4">
          <form onSubmit={addScan} className="flex gap-2 max-w-md">
            <input
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Scan item LID (e.g. bedsheet, blanket, pillow…)"
              className="flex-1 bg-rail-950 border border-rail-700 rounded px-3 py-2 text-sm pnr-digits text-rail-100 focus:outline-none focus:border-brass-400"
            />
            <button className="px-3 py-2 rounded border border-rail-600 text-xs hover:border-brass-400 hover:text-brass-400 transition-colors">
              Add scan
            </button>
          </form>

          {scannedLids.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {scannedLids.map((lid) => (
                <span
                  key={lid}
                  className="pnr-digits text-xs bg-rail-800 border border-rail-700 rounded-full px-2.5 py-1 text-rail-200 flex items-center gap-1.5"
                >
                  {lid}
                  <button onClick={() => removeScan(lid)} className="text-rail-500 hover:text-signal-red">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <form onSubmit={submitItemized} className="flex gap-2 items-end max-w-md">
            <div className="flex-1">
              <label className="block text-[11px] uppercase tracking-[0.15em] text-rail-400 mb-1.5">
                PNR
              </label>
              <input
                value={pnr}
                onChange={(e) => setPnr(e.target.value)}
                placeholder="10-digit PNR"
                className="w-full bg-rail-950 border border-rail-700 rounded px-3 py-2 text-sm pnr-digits text-rail-100 focus:outline-none focus:border-brass-400"
              />
            </div>
            <button
              type="submit"
              disabled={!pnr.trim() || scannedLids.length === 0 || busy}
              className="px-5 py-2 rounded bg-brass-500 text-rail-950 text-sm font-medium hover:bg-brass-400 transition-colors disabled:opacity-40"
            >
              {busy ? 'Checking…' : 'Confirm unassign'}
            </button>
          </form>
        </div>
      )}

      {error && <div className="text-signal-red text-xs mt-3">{error}</div>}
      {!error && result && <div className="text-signal-green text-xs mt-3">{result}</div>}
    </div>
  );
}
