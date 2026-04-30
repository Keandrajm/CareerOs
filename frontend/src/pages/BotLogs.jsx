import React, { useEffect, useState } from 'react';
import ActivityLog from '../components/ActivityLog.jsx';
import { getLogs } from '../api.js';

const EVENT_TYPES = ['', 'scan_start', 'scan_fetch', 'scan_complete', 'scored', 'filter_reject',
  'ingest', 'approval', 'draft_resume', 'draft_cover', 'packet_start', 'packet_created',
  'source_scan', 'url_check_start', 'url_check_complete', 'broken_link', 'system_learning',
  'system_check_start', 'system_check_complete', 'scan_skip', 'error', 'ai_error'];

export default function BotLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [limit, setLimit] = useState(100);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    const params = { limit };
    if (filter) params.event_type = filter;
    getLogs(params)
      .then(r => { setLogs(r.data.logs || []); setTotal(r.data.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter, limit]);

  return (
    <div>
      <div className="page-header">
        <h1>🤖 Bot Activity Log</h1>
        <p>Every action CareerOS takes is logged here. {total} total events.</p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
        >
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t || 'All Events'}</option>)}
        </select>
        <select
          value={limit}
          onChange={e => setLimit(Number(e.target.value))}
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
        >
          <option value={50}>Last 50</option>
          <option value={100}>Last 100</option>
          <option value={250}>Last 250</option>
          <option value={500}>Last 500</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={() => { setFilter(''); setLimit(100); }}>Reset</button>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Showing {logs.length} of {total} events
        </span>
      </div>
      {loading ? <div className="loading">Loading logs…</div> : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <ActivityLog logs={logs} />
        </div>
      )}
    </div>
  );
}
