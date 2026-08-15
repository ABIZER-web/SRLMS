import React, { useEffect, useState } from 'react';
import RailwayLayout from '../../components/RailwayLayout.jsx';
import client from '../../api/client';

export default function Passengers() {
  const [q, setQ] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);

  function load(query) {
    setLoading(true);
    client
      .get(`/railway/passengers${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      .then((res) => setRecords(res.data.records))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load('');
  }, []);

  async function toggle(pnr) {
    if (expanded === pnr) {
      setExpanded(null);
      return;
    }
    setExpanded(pnr);
    setDetail(null);
    const res = await client.get(`/railway/passengers/${pnr}`);
    setDetail(res.data);
  }

  return (
    <RailwayLayout>
      <h2 className="font-display text-xl text-rail-100 mb-4">Passengers</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
        className="flex gap-2 mb-5 max-w-md"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search PNR, name, train, coach…"
          className="flex-1 bg-rail-950 border border-rail-700 rounded px-3 py-2 text-sm text-rail-100 focus:outline-none focus:border-brass-400"
        />
        <button className="px-4 py-2 rounded border border-rail-600 text-xs hover:border-brass-400 hover:text-brass-400 transition-colors">
          Search
        </button>
      </form>

      {loading ? (
        <div className="text-rail-400 text-sm">Loading…</div>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div key={r._id} className="border border-rail-700/70 rounded-lg bg-rail-900/40 overflow-hidden">
              <button
                onClick={() => toggle(r.pnr)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-rail-800/40 transition-colors"
              >
                <span className="flex items-center gap-3">
                  <span className="pnr-digits text-brass-400">{r.pnr}</span>
                  <span className="text-rail-200">{r.passengerName}</span>
                </span>
                <span className="text-xs text-rail-500">
                  Coach {r.coachNumber}/{r.seatNumber} ·{' '}
                  {r.linenAssignment?.returned
                    ? 'Linen returned'
                    : r.linenAssignment?.assigned
                    ? 'Linen checked out'
                    : 'No linen'}
                </span>
              </button>
              {expanded === r.pnr && detail && (
                <div className="px-4 pb-4 pt-1 border-t border-rail-800 text-sm space-y-3">
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
                    <Row label="Train" value={`${detail.record.trainNumber} — ${detail.record.trainName}`} />
                    <Row label="Route" value={`${detail.record.sourceStation} → ${detail.record.destinationStation}`} />
                    <Row label="Journey date" value={detail.record.journeyDate} />
                    <Row label="Booking status" value={detail.record.bookingStatus} />
                    <Row label="Boarding" value={detail.record.boardingStatus} />
                    <Row
                      label="Linen"
                      value={
                        detail.record.linenAssignment?.returned
                          ? `Returned (${detail.record.linenAssignment.returnMethod})`
                          : detail.record.linenAssignment?.assigned
                          ? `Checked out since ${new Date(detail.record.linenAssignment.assignedAt).toLocaleString()}`
                          : 'Not assigned'
                      }
                    />
                  </div>

                  {detail.blacklist && (
                    <div className="border border-signal-red/40 bg-signal-red/10 rounded px-3 py-2 text-signal-red text-xs">
                      ⚠ BLACKLIST MATCH — {detail.blacklist.recordId} ({detail.blacklist.status})
                    </div>
                  )}

                  {detail.incidents.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.12em] text-rail-500 mb-1">
                        Related incidents
                      </div>
                      {detail.incidents.map((inc) => (
                        <div key={inc._id} className="text-xs text-rail-300 flex justify-between border-b border-rail-800 py-1">
                          <span>{inc.itemType} ({inc.lid})</span>
                          <span className="text-rail-500">{inc.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
