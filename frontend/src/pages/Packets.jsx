import React, { useEffect, useState } from 'react';
import JobPacket from '../components/JobPacket.jsx';
import ScoreBadge from '../components/ScoreBadge.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { getPackets } from '../api.js';

export default function Packets() {
  const [packets, setPackets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    getPackets().then(r => { setPackets(r.data.packets || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>📦 Application Packets</h1>
        <p>Complete packets with resume drafts, cover letters, and application answers.</p>
      </div>
      {loading ? <div className="loading">Loading…</div> : packets.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📦</div><h3>No packets yet</h3><p>Click "Generate Packet" on any scored job to create one.</p></div>
      ) : (
        <div className="job-grid">
          {packets.map(p => (
            <div key={p.id} className={`job-card label-${p.label}`}>
              <div className="job-card-header">
                <div style={{ flex: 1 }}>
                  <div className="job-card-title">{p.title}</div>
                  <div className="job-card-company">{p.company}</div>
                  <div className="job-card-meta">
                    {p.salary_text && <span className="meta-pill">💰 {p.salary_text}</span>}
                    {p.remote_status && <span className="meta-pill">🌐 {p.remote_status}</span>}
                    <StatusBadge status={p.status} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Created: {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <ScoreBadge score={p.score} label={p.label} />
              </div>
              <div className="job-card-actions">
                {p.source_url && <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">🔗 View Job</a>}
                <button className="btn btn-primary btn-sm" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                  {expanded === p.id ? '▲ Hide Packet' : '📄 View Packet'}
                </button>
                {p.manual_apply_link && <a href={p.manual_apply_link} target="_blank" rel="noopener noreferrer" className="btn btn-green btn-sm">🚀 Apply Now</a>}
              </div>
              {expanded === p.id && <JobPacket jobId={p.job_id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
