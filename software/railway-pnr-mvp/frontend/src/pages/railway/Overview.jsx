import React, { useEffect, useState } from 'react';
import RailwayLayout from '../../components/RailwayLayout.jsx';
import client from '../../api/client';

function Kpi({ label, value, tone = 'text-rail-100' }) {
  return (
    <div className="border border-rail-700/70 rounded-lg bg-rail-900/50 px-4 py-3">
      <div className={`font-display text-2xl ${tone}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-rail-500 mt-1">{label}</div>
    </div>
  );
}

export default function Overview() {
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    client.get('/railway/summary').then((res) => setSummary(res.data));
    client.get('/railway/activity').then((res) => setActivity(res.data.logs));
  }, []);

  return (
    <RailwayLayout>
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Kpi label="Total passengers" value={summary.totalPassengers} />
          <Kpi label="Linen issued" value={summary.linenIssued} />
          <Kpi label="Linen returned" value={summary.linenReturned} />
          <Kpi label="Currently checked out" value={summary.linenCurrentlyAssigned} tone="text-signal-amber" />
          <Kpi label="Missing items" value={summary.missingItems} tone="text-signal-red" />
          <Kpi label="Open alerts" value={summary.openAlerts} tone="text-signal-red" />
          <Kpi label="Active blacklist" value={summary.activeBlacklist} tone="text-signal-amber" />
          <Kpi label="Total kits" value={summary.totalKits} />
        </div>
      )}

      <div className="border border-rail-700/70 rounded-lg bg-rail-900/50 p-5">
        <h2 className="font-display text-lg text-rail-100 mb-1">Live activity</h2>
        <p className="text-rail-400 text-xs mb-4">
          Every linen assignment/return, gate alert, incident review, and blacklist decision across the
          system, most recent first.
        </p>

        {activity.length === 0 ? (
          <div className="text-rail-500 text-sm">No activity recorded yet.</div>
        ) : (
          <div className="space-y-1.5">
            {activity.map((log) => (
              <div
                key={log._id}
                className="flex items-start justify-between text-sm border-b border-rail-800 pb-1.5"
              >
                <span className="text-rail-200">{log.description}</span>
                <span className="text-rail-500 text-xs whitespace-nowrap ml-4">
                  {log.actorEmpId ? `${log.actorEmpId} · ` : ''}
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </RailwayLayout>
  );
}
