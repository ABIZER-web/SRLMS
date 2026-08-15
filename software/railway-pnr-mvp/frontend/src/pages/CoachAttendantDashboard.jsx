import React, { useEffect, useState } from 'react';
import client from '../api/client';
import Layout from '../components/Layout.jsx';
import PnrTable from '../components/PnrTable.jsx';
import LinenAssignPanel from '../components/LinenAssignPanel.jsx';
import LinenUnassignPanel from '../components/LinenUnassignPanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function CoachAttendantDashboard() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await client.get(`/pnr/coach/${user.assignedCoachNumber}`);
      setRecords(res.data.records);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load coach manifest');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markBoarded(id) {
    await client.patch(`/pnr/${id}/board`);
    load();
  }

  const boardedCount = records.filter((r) => r.boardingStatus === 'boarded').length;

  return (
    <Layout>
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="font-display text-2xl text-rail-100">Coach {user.assignedCoachNumber} manifest</h1>
        <span className="text-sm text-rail-400">
          {boardedCount} / {records.length} boarded
        </span>
      </div>
      <p className="text-rail-400 text-sm mb-6">
        Every passenger whose ticket QR resolves to this coach. Their PNR, name, and seat are already
        set by IRCTC at booking time — this list is what scanning each ticket at the berth would show.
      </p>
      <div className="ledger-rule mb-6" />

      {loading && <div className="text-rail-400 text-sm">Loading manifest…</div>}
      {error && <div className="text-signal-red text-sm">{error}</div>}
      {!loading && !error && <PnrTable records={records} canBoard onMarkBoarded={markBoarded} />}

      <div className="mt-8">
        <LinenAssignPanel onAssigned={load} />
      </div>

      <div className="mt-6">
        <LinenUnassignPanel onUnassigned={load} />
      </div>
    </Layout>
  );
}
