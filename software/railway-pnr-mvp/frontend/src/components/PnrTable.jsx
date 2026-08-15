import React from 'react';

const STATUS_STYLE = {
  Confirmed: 'text-signal-green border-signal-green/40 bg-signal-green/10',
  RAC: 'text-signal-amber border-signal-amber/40 bg-signal-amber/10',
  Waitlisted: 'text-signal-red border-signal-red/40 bg-signal-red/10',
};

export default function PnrTable({ records, onMarkBoarded, canBoard }) {
  if (!records || records.length === 0) {
    return (
      <div className="border border-dashed border-rail-700 rounded-lg py-12 text-center text-rail-400">
        No records to show.
      </div>
    );
  }

  return (
    <div className="border border-rail-700/70 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-rail-800/80 text-left text-[11px] uppercase tracking-[0.12em] text-rail-400">
            <th className="px-4 py-3 font-medium">PNR</th>
            <th className="px-4 py-3 font-medium">Passenger</th>
            <th className="px-4 py-3 font-medium">Coach / Seat</th>
            <th className="px-4 py-3 font-medium">Berth</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Boarding</th>
            <th className="px-4 py-3 font-medium">Linen</th>
            {canBoard && <th className="px-4 py-3 font-medium"></th>}
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr
              key={r._id || r.pnr}
              className={`${i % 2 === 0 ? 'bg-rail-900/40' : 'bg-rail-900/10'} border-t border-rail-800`}
            >
              <td className="px-4 py-3 pnr-digits text-brass-400">{r.pnr}</td>
              <td className="px-4 py-3">
                <div className="text-rail-100">{r.passengerName}</div>
                <div className="text-xs text-rail-400">
                  {r.age}{r.gender} · {r.mobile}
                </div>
              </td>
              <td className="px-4 py-3 text-rail-200">
                {r.coachNumber} / {r.seatNumber}
              </td>
              <td className="px-4 py-3 text-rail-300">{r.berthType}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[11px] border ${
                    STATUS_STYLE[r.bookingStatus] || ''
                  }`}
                >
                  {r.bookingStatus}
                </span>
              </td>
              <td className="px-4 py-3 text-rail-300">
                {r.boardingStatus === 'boarded' ? (
                  <span className="text-signal-green">Boarded</span>
                ) : (
                  <span className="text-rail-500">Pending</span>
                )}
              </td>
              <td className="px-4 py-3 text-rail-300">
                {r.linenAssignment?.returned ? (
                  <span className="text-rail-400">Returned</span>
                ) : r.linenAssignment?.assigned ? (
                  <span className="text-signal-amber">Checked out</span>
                ) : (
                  <span className="text-rail-500">Not assigned</span>
                )}
              </td>
              {canBoard && (
                <td className="px-4 py-3 text-right">
                  {r.boardingStatus !== 'boarded' && (
                    <button
                      onClick={() => onMarkBoarded(r._id)}
                      className="text-xs px-2.5 py-1 rounded border border-rail-600 hover:border-brass-400 hover:text-brass-400 transition-colors"
                    >
                      Mark boarded
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
