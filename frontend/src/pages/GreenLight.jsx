import React, { useEffect, useState, useCallback } from 'react';
import JobCard from '../components/JobCard.jsx';
import FilterBar from '../components/FilterBar.jsx';
import { getJobs } from '../api.js';
import { toJobQuery } from '../filterParams.js';

const EMPTY = { search: '', status: '', source: '', minScore: '', company: '', title: '', remoteStatus: '', salaryMin: '', salaryMax: '', postedAfter: '', postedBefore: '' };

export default function GreenLight() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    const params = toJobQuery(filters, { label: 'green' });
    const res = await getJobs(params);
    setJobs(res.data.jobs || []);
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-header">
        <h1>🟢 Green Light Jobs</h1>
        <p>Score 80–100 — strong matches. Generate packets and prepare to apply.</p>
      </div>
      <FilterBar filters={{ ...filters, label: 'green' }} onChange={f => setFilters({ ...f, label: undefined })} onReset={() => setFilters(EMPTY)} />
      {loading ? <div className="loading">Loading…</div> : jobs.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🟢</div><h3>No green light jobs yet</h3><p>Run a scan or load sample jobs to see results.</p></div>
      ) : (
        <div className="job-grid">{jobs.map(j => <JobCard key={j.id} job={j} onRefresh={load} />)}</div>
      )}
    </div>
  );
}
