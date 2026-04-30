import React, { useEffect, useState } from 'react';
import { getJob } from '../api.js';

export default function JobPacket({ jobId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    getJob(jobId).then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [jobId]);

  if (loading) return <div className="loading">Loading packet…</div>;
  if (!data) return null;

  const { packet, resume, coverLetter, scoreDetails } = data;
  const pkt = packet?.packet || packet;

  const tabs = [
    { id: 'overview',  label: '📋 Overview'   },
    { id: 'resume',    label: '📄 Resume'      },
    { id: 'cover',     label: '✉️ Cover Letter' },
    { id: 'answers',   label: '💬 App Answers' },
  ];

  return (
    <div className="packet-view">
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
        {pkt?.manual_apply_link && (
          <a href={pkt.manual_apply_link} target="_blank" rel="noopener noreferrer" className="btn btn-green btn-sm" style={{ marginLeft: 'auto' }}>
            🚀 Apply Now
          </a>
        )}
      </div>

      {tab === 'overview' && (
        <div>
          <div className="packet-section">
            <h3>Match Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {[
                ['Score',          pkt?.match_score ?? scoreDetails?.total_score ?? '?'],
                ['Label',          pkt?.label ?? data.label ?? '?'],
                ['Salary',         pkt?.salary_range ?? data.salary_text ?? '?'],
                ['Remote',         pkt?.remote_status ?? data.remote_status ?? '?'],
                ['Posted',         pkt?.posted_date ?? data.posted_date ?? '?'],
                ['Skills Gap',     pkt?.skills_gap_level ?? scoreDetails?.skills_gap_level ?? '?'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.6rem 0.85rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{k}</div>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{String(v)}</div>
                </div>
              ))}
            </div>
          </div>

          {(pkt?.why_it_matches || scoreDetails?.why_it_matches) && (
            <div className="packet-section">
              <h3>Why It Matches</h3>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{pkt?.why_it_matches || scoreDetails?.why_it_matches}</p>
            </div>
          )}

          {(pkt?.missing_or_weak || scoreDetails?.missing_or_weak_requirements) && (
            <div className="packet-section">
              <h3>Missing / Weak Requirements</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--yellow)', lineHeight: 1.5 }}>{pkt?.missing_or_weak || scoreDetails?.missing_or_weak_requirements}</p>
            </div>
          )}

          {pkt?.keywords_added?.length > 0 && (
            <div className="packet-section">
              <h3>Keywords Added to Resume</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {pkt.keywords_added.map(k => (
                  <span key={k} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}>{k}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'resume' && (
        <div className="packet-section">
          <h3>Tailored Resume Draft</h3>
          {pkt?.resume_change_summary && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              <strong>Changes:</strong> {pkt.resume_change_summary}
            </p>
          )}
          <pre>{pkt?.resume_draft || resume?.resume_text || 'No resume draft available. Click "Generate Packet" to create one.'}</pre>
        </div>
      )}

      {tab === 'cover' && (
        <div className="packet-section">
          <h3>Cover Letter Draft</h3>
          {pkt?.cover_letter_angle && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              <strong>Angle:</strong> {pkt.cover_letter_angle}
            </p>
          )}
          <pre>{pkt?.cover_letter_draft || coverLetter?.cover_letter_text || 'No cover letter draft available. Click "Generate Packet" to create one.'}</pre>
        </div>
      )}

      {tab === 'answers' && (
        <div>
          <div className="packet-section">
            <h3>Suggested Application Answers</h3>
            {pkt?.application_answers?.length > 0 ? (
              pkt.application_answers.map((qa, i) => (
                <div key={i} style={{ marginBottom: '1rem', background: 'var(--surface2)', borderRadius: 6, padding: '0.85rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.35rem', fontSize: '0.85rem', color: 'var(--accent-hover)' }}>Q: {qa.question}</div>
                  <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{qa.answer}</div>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No answers available. Generate a packet first.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
