import React, { useEffect, useState, useCallback } from 'react';
import JobCard from '../components/JobCard.jsx';
import { getJobs } from '../api.js';

export default function ManualApply() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // Show approved jobs + packet-ready green jobs
    const [approvedRes, packetRes] = await Promise.all([
      getJobs({ status: 'approved' }),
      getJobs({ status: 'packet_ready', label: 'green' })
    ]);
    const all = [...(approvedRes.data.jobs || []), ...(packetRes.data.jobs || [])];
    // Deduplicate by id
    const seen = new Set();
    setJobs(all.filter(j => { if (seen.has(j.id)) return false; seen.add(j.id); return true; }));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-header">
        <h1>✍️ Manual Apply</h1>
        <p>Jobs approved for application. Review packets, copy your tailored resume and cover letter, then apply manually.</p>
      </div>
      <div style={{ background: 'var(--blue-bg)', border: '1px solid var(--blue)', borderRadius: 8, padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--blue)' }}>
        ⚠️ <strong>CareerOS never submits applications automatically.</strong> Use "Apply Now" links to open the job application page, then submit yourself using the drafted materials.
      </div>
      {loading ? <div className="loading">Loading…</div> : jobs.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">✍️</div><h3>No jobs ready to apply</h3><p>Approve jobs or generate packets on green light jobs to see them here.</p></div>
      ) : (
        <div className="job-grid">{jobs.map(j => <JobCard key={j.id} job={j} onRefresh={load} />)}</div>
      )}
    </div>
  );
}
