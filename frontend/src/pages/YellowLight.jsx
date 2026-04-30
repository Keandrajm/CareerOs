import React, { useEffect, useState, useCallback } from 'react';
import JobCard from '../components/JobCard.jsx';
import FilterBar from '../components/FilterBar.jsx';
import { getJobs } from '../api.js';

const EMPTY = { search: '', status: '', source: '', minScore: '' };

export default function YellowLight() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    const params = { label: 'yellow' };
    if (filters.search)   params.search   = filters.search;
    if (filters.status)   params.status   = filters.status;
    if (filters.source)   params.source   = filters.source;
    if (filters.minScore) params.minScore = filters.minScore;
    const res = await getJobs(params);
    setJobs(res.data.jobs || []);
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-header">
        <h1>🟡 Yellow Light Jobs</h1>
        <p>Score 65–79 — worth reviewing. May need stronger tailoring or additional context.</p>
      </div>
      <FilterBar filters={{ ...filters, label: 'yellow' }} onChange={f => setFilters({ ...f, label: undefined })} onReset={() => setFilters(EMPTY)} />
      {loading ? <div className="loading">Loading…</div> : jobs.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🟡</div><h3>No yellow light jobs yet</h3><p>Run a scan or load sample jobs to see results.</p></div>
      ) : (
        <div className="job-grid">{jobs.map(j => <JobCard key={j.id} job={j} onRefresh={load} />)}</div>
      )}
    </div>
  );
}
