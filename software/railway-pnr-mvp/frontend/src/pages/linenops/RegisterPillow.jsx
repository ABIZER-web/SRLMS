import React, { useEffect, useState } from 'react';
import LinenOpsLayout from '../../components/LinenOpsLayout.jsx';
import QrImage from '../../components/QrImage.jsx';
import client from '../../api/client';

export default function RegisterPillow() {
  const [meta, setMeta] = useState(null);
  const [regionCode, setRegionCode] = useState(8);
  const [pillow, setPillow] = useState(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    client.get('/linen-ops/meta').then((res) => setMeta(res.data));
  }, []);

  if (!meta) return <LinenOpsLayout><div className="text-rail-400 text-sm">Loading…</div></LinenOpsLayout>;

  const PILLOW_CODE = 3;

  async function scan() {
    setError('');
    setScanning(true);
    try {
      const res = await client.post('/linen-ops/items', { regionCode, linenCode: PILLOW_CODE });
      setPillow(res.data.item);
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed');
    } finally {
      setScanning(false);
    }
  }

  return (
    <LinenOpsLayout>
      <div className="max-w-lg">
        <h2 className="font-display text-xl text-rail-100 mb-1">Register individual pillow</h2>
        <p className="text-rail-400 text-xs mb-5">
          Pillows ship loose (they can't fit in the sealed 5-item bag) and get their own RFID + QR,
          independent of any kit.
        </p>

        {!pillow ? (
          <>
            <div className="mb-5">
              <label className="block text-[11px] uppercase tracking-[0.15em] text-rail-400 mb-1.5">
                Region
              </label>
              <select
                value={regionCode}
                onChange={(e) => setRegionCode(Number(e.target.value))}
                className="bg-rail-950 border border-rail-700 rounded px-3 py-2 text-sm text-rail-100 focus:outline-none focus:border-brass-400"
              >
                {Object.entries(meta.regions).map(([code, name]) => (
                  <option key={code} value={code}>
                    {code} — {name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={scan}
              disabled={scanning}
              className="w-full py-2.5 rounded bg-brass-500 text-rail-950 text-sm font-medium hover:bg-brass-400 transition-colors disabled:opacity-50"
            >
              {scanning ? 'Scanning…' : 'Simulate RFID scan'}
            </button>
            {error && <div className="text-signal-red text-xs mt-3">{error}</div>}
          </>
        ) : (
          <div className="border border-signal-green/40 bg-signal-green/5 rounded-lg p-6">
            <div className="pnr-digits text-brass-400 text-lg mb-1">{pillow.lid}</div>
            <div className="text-rail-400 text-xs mb-4">{pillow.qrCode}</div>
            <QrImage code={pillow.qrCode} />
            <button
              onClick={() => setPillow(null)}
              className="mt-6 w-full py-2 rounded bg-brass-500 text-rail-950 text-sm font-medium hover:bg-brass-400 transition-colors"
            >
              Register another pillow
            </button>
          </div>
        )}
      </div>
    </LinenOpsLayout>
  );
}
