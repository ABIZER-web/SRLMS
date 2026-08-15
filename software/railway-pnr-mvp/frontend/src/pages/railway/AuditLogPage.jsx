import React, { useEffect, useState } from 'react';
import RailwayLayout from '../../components/RailwayLayout.jsx';
import client from '../../api/client';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get('/railway/audit')
      .then((res) => setLogs(res.data.logs))
      .finally(() => setLoading(false));
  }, []);

  return (
    <RailwayLayout>
      <h2 className="font-display text-xl text-rail-100 mb-1">Audit log</h2>
      <p className="text-rail-400 text-xs mb-5">
        Append-only. Every assignment, return, gate alert, incident review, and blacklist decision is
        recorded here with who did it and when.
      </p>

      {loading ? (
        <div className="text-rail-400 text-sm">Loading…</div>
      ) : (
        <div className="border border-rail-700/70 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-rail-800/80 text-left text-[11px] uppercase tracking-[0.12em] text-rail-400">
                <th className="px-4 py-2.5 font-medium">Time</th>
                <th className="px-4 py-2.5 font-medium">Actor</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log._id} className={`${i % 2 === 0 ? 'bg-rail-900/40' : 'bg-rail-900/10'} border-t border-rail-800`}>
                  <td className="px-4 py-2.5 text-rail-400 text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-rail-300 text-xs">
                    {log.actorEmpId || '—'}
                    {log.actorRole ? ` (${log.actorRole})` : ''}
                  </td>
                  <td className="px-4 py-2.5 pnr-digits text-brass-400 text-xs">{log.action}</td>
                  <td className="px-4 py-2.5 text-rail-200">{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </RailwayLayout>
  );
}
