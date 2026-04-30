import React from 'react';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ActivityLog({ logs }) {
  if (!logs?.length) return (
    <div className="empty-state"><div className="empty-icon">🤖</div><h3>No activity yet</h3><p>Run a scan to see activity here.</p></div>
  );

  return (
    <table className="log-table">
      <thead>
        <tr>
          <th>Event</th>
          <th>Message</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        {logs.map(log => (
          <tr key={log.id}>
            <td>
              <span className={`event-type event-${log.event_type}`}>{log.event_type}</span>
            </td>
            <td>{log.message}</td>
            <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{timeAgo(log.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
