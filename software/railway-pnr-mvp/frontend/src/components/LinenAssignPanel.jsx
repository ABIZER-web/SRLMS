import React, { useState } from 'react';
import client from '../api/client';

const STEP_LABEL = ['Scan kit QR', 'Scan pillow QR', 'Enter PNR', 'Link'];

export default function LinenAssignPanel({ defaultPnr, onAssigned }) {
  const [kitQrCode, setKitQrCode] = useState('');
  const [pillowQrCode, setPillowQrCode] = useState('');
  const [pnr, setPnr] = useState(defaultPnr || '');
  const [kit, setKit] = useState(null);
  const [pillow, setPillow] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [linking, setLinking] = useState(false);

  async function scanKit(e) {
    e.preventDefault();
    setError('');
    setKit(null);
    try {
      const res = await client.get(`/linen/kit/${kitQrCode.trim()}`);
      setKit(res.data.kit);
      setStatus(`Kit scanned — ${res.data.kit.items.length} items linked (torn open, cannot be rescanned).`);
    } catch (err) {
      setError(err?.response?.data?.message || 'Kit scan failed');
    }
  }

  async function scanPillow(e) {
    e.preventDefault();
    setError('');
    setPillow(null);
    try {
      const res = await client.get(`/linen/pillow/${pillowQrCode.trim()}`);
      setPillow(res.data.pillow);
      setStatus('Pillow scanned.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Pillow scan failed');
    }
  }

  async function link(e) {
    e.preventDefault();
    setError('');
    setLinking(true);
    try {
      const res = await client.post('/linen/assign', {
        kitQrCode: kitQrCode.trim(),
        pillowQrCode: pillowQrCode.trim(),
        pnr: pnr.trim(),
      });
      setStatus(`Linked — 6 items now assigned to PNR ${pnr.trim()}.`);
      setKit(null);
      setPillow(null);
      setKitQrCode('');
      setPillowQrCode('');
      if (onAssigned) onAssigned(res.data.pnrRecord);
    } catch (err) {
      setError(err?.response?.data?.message || 'Linking failed');
    } finally {
      setLinking(false);
    }
  }

  const canLink = kit && pillow && pnr.trim().length > 0;

  return (
    <div className="border border-rail-700/70 rounded-lg bg-rail-900/50 p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="font-display text-lg text-rail-100">Assign linen kit</h2>
        <div className="flex gap-1.5">
          {STEP_LABEL.map((label, i) => (
            <span key={label} className="text-[10px] uppercase tracking-[0.1em] text-rail-500">
              {i > 0 && '·'} {label}
            </span>
          ))}
        </div>
      </div>
      <p className="text-rail-400 text-xs mb-5">
        Scan the sealed kit bag, then the loose pillow, then confirm the passenger's PNR — either from
        their ticket QR or typed in manually if the ticket has none.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        {/* Kit scan */}
        <form onSubmit={scanKit} className="space-y-2">
          <label className="block text-[11px] uppercase tracking-[0.15em] text-rail-400">
            1 · Kit QR (paper bag)
          </label>
          <div className="flex gap-2">
            <input
              value={kitQrCode}
              onChange={(e) => setKitQrCode(e.target.value)}
              placeholder="KIT-000001"
              className="flex-1 bg-rail-950 border border-rail-700 rounded px-3 py-2 text-sm pnr-digits text-rail-100 focus:outline-none focus:border-brass-400"
            />
            <button className="px-3 py-2 rounded border border-rail-600 text-xs hover:border-brass-400 hover:text-brass-400 transition-colors">
              Scan
            </button>
          </div>
          {kit && (
            <ul className="text-xs text-rail-300 space-y-0.5 pl-1">
              {kit.items.map((it) => (
                <li key={it._id} className="flex justify-between">
                  <span>{it.itemType}</span>
                  <span className="pnr-digits text-rail-500">{it.lid}</span>
                </li>
              ))}
            </ul>
          )}
        </form>

        {/* Pillow scan */}
        <form onSubmit={scanPillow} className="space-y-2">
          <label className="block text-[11px] uppercase tracking-[0.15em] text-rail-400">2 · Pillow QR</label>
          <div className="flex gap-2">
            <input
              value={pillowQrCode}
              onChange={(e) => setPillowQrCode(e.target.value)}
              placeholder="PIL-000001"
              className="flex-1 bg-rail-950 border border-rail-700 rounded px-3 py-2 text-sm pnr-digits text-rail-100 focus:outline-none focus:border-brass-400"
            />
            <button className="px-3 py-2 rounded border border-rail-600 text-xs hover:border-brass-400 hover:text-brass-400 transition-colors">
              Scan
            </button>
          </div>
          {pillow && (
            <div className="text-xs text-rail-300 flex justify-between pl-1">
              <span>Pillow</span>
              <span className="pnr-digits text-rail-500">{pillow.lid}</span>
            </div>
          )}
        </form>
      </div>

      <form onSubmit={link} className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-[11px] uppercase tracking-[0.15em] text-rail-400 mb-1.5">
            3 · Passenger PNR (from ticket QR, or type manually)
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
          disabled={!canLink || linking}
          className="px-5 py-2 rounded bg-brass-500 text-rail-950 text-sm font-medium hover:bg-brass-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {linking ? 'Linking…' : 'Link'}
        </button>
      </form>

      {error && <div className="text-signal-red text-xs mt-3">{error}</div>}
      {!error && status && <div className="text-signal-green text-xs mt-3">{status}</div>}
    </div>
  );
}
