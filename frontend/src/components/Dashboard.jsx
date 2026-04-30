import React, { useEffect, useState } from 'react';
import { getJobs, getLogs } from '../api.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getJobs(),
      getLogs({ limit: 4 })
    ]).then(([jobsRes, logsRes]) => {
      const jobs = jobsRes.data.jobs || [];
      setStats({
        total: jobs.length,
        green: jobs.filter(j => j.label === 'green').length,
        yellow: jobs.filter(j => j.label === 'yellow').length,
        red: jobs.filter(j => j.label === 'red').length,
        approved: jobs.filter(j => j.status === 'approved').length,
        packets: jobs.filter(j => j.status === 'packet_ready').length,
        selfApplied: jobs.filter(j => j.status === 'self_applied').length,
        recentLogs: logsRes.data.logs || []
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading...</div>;
  if (!stats) return null;

  const cards = [
    ['Total Jobs', stats.total, 'blue'],
    ['Green Light', stats.green, 'green'],
    ['Yellow Light', stats.yellow, 'yellow'],
    ['Rejected', stats.red, 'red'],
    ['Packets Ready', stats.packets, ''],
    ['Self-Applied', stats.selfApplied, ''],
  ];

  return (
    <div>
      <div className="stats-row">
        {cards.map(([label, value, tone]) => (
          <div key={label} className={`stat-card ${tone}`}>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>
      {stats.recentLogs.length > 0 && (
        <div className="job-card" style={{ marginBottom: '1.25rem' }}>
          <div className="job-card-header">
            <div>
              <div className="job-card-title">Recent Activity</div>
              <div className="job-card-company">Latest scanner, scoring, and packet events</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '0.45rem' }}>
            {stats.recentLogs.map(log => (
              <div key={log.id} style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <span className={`event-type event-${log.event_type}`}>{log.event_type}</span>
                <span style={{ color: 'var(--text)' }}>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
