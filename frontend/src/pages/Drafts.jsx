import React, { useEffect, useState } from 'react';
import { getPackets } from '../api.js';

export default function Drafts() {
  const [packets, setPackets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState({});

  useEffect(() => {
    getPackets().then(r => { setPackets(r.data.packets || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  function toggle(id, type) {
    setView(v => ({ ...v, [`${id}-${type}`]: !v[`${id}-${type}`] }));
  }

  return (
    <div>
      <div className="page-header">
        <h1>📄 Drafts</h1>
        <p>Tailored resume and cover letter drafts for your applications.</p>
      </div>
      {loading ? <div className="loading">Loading…</div> : packets.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">✏️</div><h3>No drafts yet</h3><p>Generate packets on Green Light jobs to see drafts here.</p></div>
      ) : (
        <div className="job-grid">
          {packets.map(p => {
            const pkt = p.packet?.packet || p.packet;
            return (
              <div key={p.id} className="job-card">
                <div className="job-card-title">{p.title}</div>
                <div className="job-card-company" style={{ marginBottom: '0.75rem' }}>{p.company}</div>
                <div className="job-card-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => toggle(p.id, 'resume')}>
                    {view[`${p.id}-resume`] ? '▲ Hide Resume' : '📄 View Resume Draft'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => toggle(p.id, 'cover')}>
                    {view[`${p.id}-cover`] ? '▲ Hide Cover Letter' : '✉️ View Cover Letter'}
                  </button>
                </div>
                {view[`${p.id}-resume`] && (
                  <div className="packet-section" style={{ marginTop: '0.75rem' }}>
                    <h3>Resume Draft — {pkt?.suggested_resume_filename || p.title}</h3>
                    {pkt?.resume_change_summary && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Changes: {pkt.resume_change_summary}</p>}
                    <pre>{pkt?.resume_draft || 'No resume draft available.'}</pre>
                  </div>
                )}
                {view[`${p.id}-cover`] && (
                  <div className="packet-section" style={{ marginTop: '0.75rem' }}>
                    <h3>Cover Letter — {p.company}</h3>
                    {pkt?.cover_letter_angle && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Angle: {pkt.cover_letter_angle}</p>}
                    <pre>{pkt?.cover_letter_draft || 'No cover letter available.'}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
