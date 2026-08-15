import React, { useState } from 'react';
import client from '../api/client';
import Layout from '../components/Layout.jsx';

export default function PassengerDashboard() {
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [pnrInput, setPnrInput] = useState('');
  const [returnStatus, setReturnStatus] = useState('');
  const [returning, setReturning] = useState(false);

  async function lookup(e) {
    e.preventDefault();
    setError('');
    setRecord(null);
    setReturnStatus('');
    try {
      const res = await client.get(`/pnr/${pnrInput.trim()}`);
      setRecord(res.data.record);
    } catch (err) {
      setError(err?.response?.data?.message || 'Lookup failed');
    }
  }

  async function returnLinen() {
    setReturnStatus('');
    setReturning(true);
    try {
      const res = await client.post('/linen/unassign/quick', { pnr: record.pnr });
      setReturnStatus(res.data.message);
      setRecord(res.data.pnrRecord);
    } catch (err) {
      setReturnStatus(err?.response?.data?.message || 'Return failed');
    } finally {
      setReturning(false);
    }
  }

  return (
    <Layout>
      <h1 className="font-display text-2xl text-rail-100 mb-1">Your ticket</h1>
      <p className="text-rail-400 text-sm mb-6">
        Enter your PNR to view the seat and coach IRCTC already assigned you. In the printed seed
        credentials, your PNR is shown next to your mobile login.
      </p>

      <form onSubmit={lookup} className="flex gap-2 mb-8 max-w-sm">
        <input
          value={pnrInput}
          onChange={(e) => setPnrInput(e.target.value)}
          placeholder="10-digit PNR"
          className="flex-1 bg-rail-950 border border-rail-700 rounded px-3 py-2 text-sm pnr-digits text-rail-100 focus:outline-none focus:border-brass-400"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded bg-brass-500 text-rail-950 text-sm font-medium hover:bg-brass-400 transition-colors"
        >
          Look up
        </button>
      </form>

      {error && <div className="text-signal-red text-sm mb-4">{error}</div>}

      {record && (
        <div className="max-w-md border border-rail-700/70 rounded-lg overflow-hidden bg-rail-900/50">
          <div className="bg-rail-800/80 px-5 py-3 flex items-center justify-between">
            <span className="pnr-digits text-brass-400 text-lg">{record.pnr}</span>
            <span className="text-[11px] uppercase tracking-[0.15em] text-rail-400">{record.bookingStatus}</span>
          </div>
          <div className="p-5 space-y-3 text-sm">
            <Row label="Passenger" value={`${record.passengerName} · ${record.age}${record.gender}`} />
            <Row label="Train" value={`${record.trainNumber} — ${record.trainName}`} />
            <Row label="Route" value={`${record.sourceStation} → ${record.destinationStation}`} />
            <Row label="Journey date" value={record.journeyDate} />
            <Row label="Coach / Seat" value={`${record.coachNumber} / ${record.seatNumber} (${record.berthType})`} />
            <Row label="Class" value={record.coachClass} />
            <Row label="Fare" value={`₹${record.fare}`} />
            <Row
              label="Boarding"
              value={record.boardingStatus === 'boarded' ? 'Boarded' : 'Not yet boarded'}
            />
            <Row
              label="Linen kit"
              value={
                record.linenAssignment?.returned
                  ? 'Returned'
                  : record.linenAssignment?.assigned
                  ? 'Assigned — checked out to you'
                  : 'Not yet assigned'
              }
            />
          </div>

          {record.linenAssignment?.assigned && !record.linenAssignment?.returned && (
            <div className="border-t border-rail-800 px-5 py-4">
              <p className="text-xs text-rail-400 mb-2">
                While this stays checked out, you're responsible for it. If the attendant hasn't come by
                to collect it yet, you can return it yourself here.
              </p>
              <button
                onClick={returnLinen}
                disabled={returning}
                className="w-full py-2 rounded border border-rail-600 text-sm hover:border-brass-400 hover:text-brass-400 transition-colors disabled:opacity-50"
              >
                {returning ? 'Returning…' : 'Return / unassign my linen'}
              </button>
              {returnStatus && <div className="text-xs text-signal-green mt-2">{returnStatus}</div>}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-rail-800 pb-2 last:border-0 last:pb-0">
      <span className="text-rail-400">{label}</span>
      <span className="text-rail-100 text-right">{value}</span>
    </div>
  );
}
