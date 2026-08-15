import React, { useEffect, useState } from 'react';
import LinenOpsLayout from '../../components/LinenOpsLayout.jsx';
import QrImage from '../../components/QrImage.jsx';
import client from '../../api/client';

const STATUS_TONE = {
  sealed: 'text-signal-green',
  assigned: 'text-signal-amber',
  consumed: 'text-rail-500',
};

export default function Kits() {
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    client
      .get('/linen-ops/kits')
      .then((res) => setKits(res.data.kits))
      .finally(() => setLoading(false));
  }, []);

  return (
    <LinenOpsLayout>
      <h2 className="font-display text-xl text-rail-100 mb-4">Kits</h2>

      {loading ? (
        <div className="text-rail-400 text-sm">Loading…</div>
      ) : kits.length === 0 ? (
        <div className="text-rail-500 text-sm">No kits registered yet.</div>
      ) : (
        <div className="space-y-2">
          {kits.map((kit) => (
            <div key={kit._id} className="border border-rail-700/70 rounded-lg bg-rail-900/40 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === kit._id ? null : kit._id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-rail-800/40 transition-colors"
              >
                <span className="pnr-digits text-brass-400">{kit.qrCode}</span>
                <span className="flex items-center gap-3">
                  <span className={`text-xs uppercase tracking-[0.1em] ${STATUS_TONE[kit.status]}`}>
                    {kit.status}
                  </span>
                  <span className="text-rail-500 text-xs">{kit.items.length} items</span>
                </span>
              </button>
              {expanded === kit._id && (
                <div className="px-4 pb-4 pt-1 border-t border-rail-800 flex gap-6">
                  <ul className="text-sm space-y-1 flex-1">
                    {kit.items.map((it) => (
                      <li key={it._id} className="flex justify-between border-b border-rail-800/60 pb-1">
                        <span className="text-rail-200">{it.itemType}</span>
                        <span className="pnr-digits text-rail-500">{it.lid}</span>
                      </li>
                    ))}
                    {kit.assignedPnr && (
                      <li className="pt-1 text-rail-400">
                        Assigned to PNR <span className="pnr-digits text-rail-200">{kit.assignedPnr}</span>
                      </li>
                    )}
                  </ul>
                  <QrImage code={kit.qrCode} size={110} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </LinenOpsLayout>
  );
}
