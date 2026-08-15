import React, { useEffect, useState } from 'react';
import LinenOpsLayout from '../../components/LinenOpsLayout.jsx';
import QrImage from '../../components/QrImage.jsx';
import client from '../../api/client';

export default function CreateKit() {
  const [meta, setMeta] = useState(null);
  const [regionCode, setRegionCode] = useState(8);
  const [registered, setRegistered] = useState([]); // [{linenCode, item}]
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [kit, setKit] = useState(null);
  const [assembling, setAssembling] = useState(false);

  useEffect(() => {
    client.get('/linen-ops/meta').then((res) => setMeta(res.data));
  }, []);

  if (!meta) return <LinenOpsLayout><div className="text-rail-400 text-sm">Loading…</div></LinenOpsLayout>;

  const steps = meta.kitLinenCodes; // [1,2,4,5,6]
  const currentStepIndex = registered.length;
  const currentLinenCode = steps[currentStepIndex];
  const allRegistered = registered.length === steps.length;

  async function scanNext() {
    setError('');
    setScanning(true);
    try {
      const res = await client.post('/linen-ops/items', {
        regionCode,
        linenCode: currentLinenCode,
      });
      setRegistered([...registered, { linenCode: currentLinenCode, item: res.data.item }]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed');
    } finally {
      setScanning(false);
    }
  }

  async function assembleKit() {
    setError('');
    setAssembling(true);
    try {
      const res = await client.post('/linen-ops/kits', {
        itemIds: registered.map((r) => r.item._id),
      });
      setKit(res.data.kit);
    } catch (err) {
      setError(err?.response?.data?.message || 'Kit assembly failed');
    } finally {
      setAssembling(false);
    }
  }

  function startOver() {
    setRegistered([]);
    setKit(null);
    setError('');
  }

  if (kit) {
    return (
      <LinenOpsLayout>
        <div className="max-w-lg border border-signal-green/40 bg-signal-green/5 rounded-lg p-6">
          <h2 className="font-display text-xl text-rail-100 mb-1">Kit registration complete</h2>
          <div className="pnr-digits text-brass-400 text-lg mb-4">{kit.qrCode}</div>

          <ul className="text-sm space-y-1 mb-5">
            {kit.items.map((it) => (
              <li key={it._id} className="flex justify-between border-b border-rail-800 pb-1">
                <span className="text-rail-200">{it.itemType}</span>
                <span className="pnr-digits text-rail-500">{it.lid}</span>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-4">
            <QrImage code={kit.qrCode} />
            <div className="text-xs text-rail-400">
              Kit QR — groups these 5 items.
              <br />
              Print this on the paper bag label.
            </div>
          </div>

          <button
            onClick={startOver}
            className="mt-6 w-full py-2 rounded bg-brass-500 text-rail-950 text-sm font-medium hover:bg-brass-400 transition-colors"
          >
            Register another kit
          </button>
        </div>
      </LinenOpsLayout>
    );
  }

  return (
    <LinenOpsLayout>
      <div className="max-w-lg">
        <h2 className="font-display text-xl text-rail-100 mb-1">Create new linen kit</h2>
        <p className="text-rail-400 text-xs mb-5">
          Standard 5-item kit: Bed Sheet 1, Bed Sheet 2, Blanket, Pillow Cover, Face Towel. Pillow is
          registered separately — see "Register Pillow".
        </p>

        <div className="mb-5">
          <label className="block text-[11px] uppercase tracking-[0.15em] text-rail-400 mb-1.5">
            Region
          </label>
          <select
            value={regionCode}
            onChange={(e) => setRegionCode(Number(e.target.value))}
            disabled={registered.length > 0}
            className="bg-rail-950 border border-rail-700 rounded px-3 py-2 text-sm text-rail-100 focus:outline-none focus:border-brass-400 disabled:opacity-50"
          >
            {Object.entries(meta.regions).map(([code, name]) => (
              <option key={code} value={code}>
                {code} — {name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 mb-5">
          {steps.map((code, i) => {
            const done = i < registered.length;
            const active = i === registered.length;
            return (
              <div
                key={code}
                className={`flex items-center justify-between px-3 py-2 rounded border text-sm ${
                  done
                    ? 'border-signal-green/40 bg-signal-green/5 text-rail-200'
                    : active
                    ? 'border-brass-400/50 bg-brass-500/5 text-rail-100'
                    : 'border-rail-800 text-rail-500'
                }`}
              >
                <span>
                  {done ? '✓' : active ? '›' : '○'} {meta.linenTypes[code]}
                </span>
                {done && <span className="pnr-digits text-xs text-rail-500">{registered[i].item.lid}</span>}
              </div>
            );
          })}
        </div>

        {!allRegistered ? (
          <button
            onClick={scanNext}
            disabled={scanning}
            className="w-full py-2.5 rounded bg-brass-500 text-rail-950 text-sm font-medium hover:bg-brass-400 transition-colors disabled:opacity-50"
          >
            {scanning ? 'Scanning…' : `Simulate RFID scan — ${meta.linenTypes[currentLinenCode]}`}
          </button>
        ) : (
          <button
            onClick={assembleKit}
            disabled={assembling}
            className="w-full py-2.5 rounded bg-brass-500 text-rail-950 text-sm font-medium hover:bg-brass-400 transition-colors disabled:opacity-50"
          >
            {assembling ? 'Generating Kit QR…' : 'All 5 verified — Generate Kit QR'}
          </button>
        )}

        {error && <div className="text-signal-red text-xs mt-3">{error}</div>}
      </div>
    </LinenOpsLayout>
  );
}
