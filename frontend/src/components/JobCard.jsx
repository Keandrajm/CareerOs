import React, { useState } from 'react';
import ScoreBadge from './ScoreBadge.jsx';
import StatusBadge from './StatusBadge.jsx';
import JobPacket from './JobPacket.jsx';
import { approveJob, rejectJob, saveJob, selfApplied, createPacket, scoreJob } from '../api.js';

export default function JobCard({ job, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [showPacket, setShowPacket] = useState(false);
  const [msg, setMsg] = useState(null);

  const act = async (fn, label) => {
    setLoading(true);
    setMsg(null);
    try {
      await fn(job.id);
      setMsg({ text: label + ' ✓', type: 'success' });
      if (onRefresh) onRefresh();
    } catch (e) {
      setMsg({ text: e.response?.data?.error || e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePacket = async () => {
    setLoading(true);
    setMsg(null);
    try {
      await createPacket(job.id);
      setMsg({ text: 'Packet created ✓', type: 'success' });
      setShowPacket(true);
      if (onRefresh) onRefresh();
    } catch (e) {
      setMsg({ text: e.response?.data?.error || e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleScore = async () => {
    setLoading(true);
    try {
      await scoreJob(job.id);
      setMsg({ text: 'Scored ✓', type: 'success' });
      if (onRefresh) onRefresh();
    } catch (e) {
      setMsg({ text: e.response?.data?.error || e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const labelCls = job.label === 'green' ? 'label-green' : job.label === 'yellow' ? 'label-yellow' : 'label-red';

  return (
    <div className={`job-card ${labelCls}`}>
      <div className="job-card-header">
        <div style={{ flex: 1 }}>
          <div className="job-card-title">{job.title}</div>
          <div className="job-card-company">{job.company}</div>
          <div className="job-card-meta">
            {job.salary_text && <span className="meta-pill">💰 {job.salary_text}</span>}
            {job.remote_status && <span className="meta-pill">🌐 {job.remote_status}</span>}
            {job.posted_date && <span className="meta-pill">📅 {job.posted_date}</span>}
            {job.source_name && <span className="meta-pill">📡 {job.source_name}</span>}
            <StatusBadge status={job.status} />
          </div>
        </div>
        <ScoreBadge score={job.score} label={job.label} />
      </div>

      {job.description_snippet && (
        <div className="job-card-snippet">{job.description_snippet}</div>
      )}

      {job.scoreDetails?.why_it_matches && (
        <div className="job-card-why">✅ {job.scoreDetails.why_it_matches}</div>
      )}
      {job.scoreDetails?.missing_or_weak_requirements && job.scoreDetails.missing_or_weak_requirements !== 'None identified' && (
        <div className="job-card-missing">⚠️ {job.scoreDetails.missing_or_weak_requirements}</div>
      )}
      {job.red_flags && (
        <div className="job-card-flags">🚩 {job.red_flags}</div>
      )}

      {msg && (
        <div style={{ fontSize: '0.8rem', marginTop: '0.4rem', color: msg.type === 'success' ? 'var(--green)' : 'var(--red)' }}>
          {msg.text}
        </div>
      )}

      <div className="job-card-actions">
        {job.source_url && (
          <a href={job.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            🔗 View Job
          </a>
        )}
        <button className="btn btn-secondary btn-sm" onClick={handleScore} disabled={loading}>
          📊 Score
        </button>
        <button className="btn btn-secondary btn-sm" onClick={handlePacket} disabled={loading}>
          📦 Generate Packet
        </button>
        {(job.status === 'packet_ready' || job.scoreDetails) && (
          <button className="btn btn-secondary btn-sm" onClick={() => setShowPacket(!showPacket)}>
            {showPacket ? '▲ Hide Packet' : '📄 View Packet'}
          </button>
        )}
        <button className="btn btn-green btn-sm" onClick={() => act(approveJob, 'Approved')} disabled={loading}>
          ✓ Approve
        </button>
        <button className="btn btn-red btn-sm" onClick={() => act(rejectJob, 'Rejected')} disabled={loading}>
          ✕ Reject
        </button>
        <button className="btn btn-yellow btn-sm" onClick={() => act(saveJob, 'Saved')} disabled={loading}>
          🔖 Save
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => act(selfApplied, 'Self-Applied')} disabled={loading}>
          ✍️ Self-Applied
        </button>
      </div>

      {showPacket && <JobPacket jobId={job.id} />}
    </div>
  );
}
