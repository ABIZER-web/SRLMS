import React, { useState } from 'react';
import LinenOpsLayout from '../../components/LinenOpsLayout.jsx';
import QrImage from '../../components/QrImage.jsx';
import client from '../../api/client';

export default function ScanFind() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function find(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const res = await client.get(`/linen-ops/scan/${code.trim()}`);
      setResult(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Lookup failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <LinenOpsLayout>
      <div className="max-w-lg">
        <h2 className="font-display text-xl text-rail-100 mb-1">Scan / find linen</h2>
        <p className="text-rail-400 text-xs mb-5">
          Enter any LID, individual item QR code, or kit QR code.
        </p>

        <form onSubmit={find} className="flex gap-2 mb-6">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="LID, LINEN-…, or KIT-…"
            className="flex-1 bg-rail-950 border border-rail-700 rounded px-3 py-2 text-sm pnr-digits text-rail-100 focus:outline-none focus:border-brass-400"
          />
          <button
            disabled={!code.trim() || busy}
            className="px-5 py-2 rounded bg-brass-500 text-rail-950 text-sm font-medium hover:bg-brass-400 transition-colors disabled:opacity-40"
          >
            {busy ? 'Searching…' : 'Find'}
          </button>
        </form>

        {error && <div className="text-signal-red text-sm mb-4">{error}</div>}

        {result?.resultType === 'item' && (
          <div className="border border-rail-700/70 rounded-lg bg-rail-900/50 p-5">
            <div className="text-[11px] uppercase tracking-[0.15em] text-rail-500 mb-2">
              Individual item
            </div>
            <div className="pnr-digits text-brass-400 text-lg mb-3">{result.item.lid}</div>
            <dl className="text-sm space-y-1.5 mb-4">
              <Row label="Type" value={result.item.itemType} />
              <Row label="QR code" value={result.item.qrCode} />
              <Row label="Status" value={result.item.status} />
              <Row label="Region code" value={result.item.regionCode} />
              <Row label="Part of kit" value={result.item.kit ? result.item.kit.qrCode : '— (standalone)'} />
              <Row label="Assigned PNR" value={result.item.assignedPnr || '—'} />
              <Row label="Registered by" value={result.item.registeredByEmpId || '—'} />
            </dl>
            <QrImage code={result.item.qrCode} />
          </div>
        )}

        {result?.resultType === 'kit' && (
          <div className="border border-rail-700/70 rounded-lg bg-rail-900/50 p-5">
            <div className="text-[11px] uppercase tracking-[0.15em] text-rail-500 mb-2">Kit</div>
            <div className="pnr-digits text-brass-400 text-lg mb-3">{result.kit.qrCode}</div>
            <dl className="text-sm space-y-1.5 mb-4">
              <Row label="Status" value={result.kit.status} />
              <Row label="Assigned PNR" value={result.kit.assignedPnr || '—'} />
              <Row label="Registered by" value={result.kit.registeredByEmpId || '—'} />
            </dl>
            <div className="text-[11px] uppercase tracking-[0.15em] text-rail-500 mb-1.5">
              {result.kit.items.length} items
            </div>
            <ul className="text-sm space-y-1 mb-4">
              {result.kit.items.map((it) => (
                <li key={it._id} className="flex justify-between border-b border-rail-800 pb-1">
                  <span className="text-rail-200">{it.itemType}</span>
                  <span className="pnr-digits text-rail-500">{it.lid}</span>
                </li>
              ))}
            </ul>
            <QrImage code={result.kit.qrCode} />
          </div>
        )}
      </div>
    </LinenOpsLayout>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <dt className="text-rail-400">{label}</dt>
      <dd className="text-rail-100 pnr-digits">{value}</dd>
    </div>
  );
}
