import React, { useEffect, useState } from 'react';
import { getJobs, getLogs } from '../api.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getJobs(),
      getLogs({ limit: 5 })
    ]).then(([jobsRes, logsRes]) => {
      const jobs = jobsRes.data.jobs || [];
      setStats({
        total: jobs.length,
        green:  jobs.filter(j => j.label === 'green').length,
        yellow: jobs.filter(j => j.label === 'yellow').length,
        red:    jobs.filter(j => j.label === 'red').length,
        approved: jobs.filter(j => j.status === 'approved').length,
        packets:  jobs.filter(j => j.status === 'packet_ready').length,
        selfApplied: jobs.filter(j => j.status === 'self_applied').length,
        recentLogs: logsRes.data.logs || []
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading…</div>;
  if (!stats) return null;

  return (
    <div>
      <div className="stats-row">
        <div className="stat-card blue"><div className="stat-value">{stats.total}</div><div className="stat-label">Total Jobs</div></div>
        <div className="stat-card green"><div className="stat-value">{stats.green}</div><div className="stat-label">Green Light</div></div>
        <div className="stat-card yellow"><div className="stat-value">{stats.yellow}</div><div className="stat-label">Yellow Light</div></div>
        <div className="stat-card red"><div className="stat-value">{stats.red}</div><div className="stat-label">Red / Rejected</div></div>
        <div className="stat-card"><div className="stat-value">{stats.packets}</div><div className="stat-label">Packets Ready</div></div>
        <div className="stat-card"><div className="stat-value">{stats.selfApplied}</div><div className="stat-label">Self-Applied</div></div>
      </div>
    </div>
  );
}
