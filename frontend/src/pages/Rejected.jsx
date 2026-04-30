import React, { useEffect, useState, useCallback } from 'react';
import JobCard from '../components/JobCard.jsx';
import FilterBar from '../components/FilterBar.jsx';
import { getJobs } from '../api.js';

const EMPTY = { search: '', source: '', minScore: '' };

export default function Rejected() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    const params = { status: 'rejected' };
    if (filters.search)   params.search   = filters.search;
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
        <h1>🔴 Rejected Jobs</h1>
        <p>Jobs filtered out automatically or rejected by you. Review hard filter reasons below.</p>
      </div>
      <FilterBar filters={filters} onChange={setFilters} onReset={() => setFilters(EMPTY)} />
      {loading ? <div className="loading">Loading…</div> : jobs.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🔴</div><h3>No rejected jobs</h3><p>Rejected jobs appear here after filtering or manual rejection.</p></div>
      ) : (
        <div className="job-grid">{jobs.map(j => <JobCard key={j.id} job={j} onRefresh={load} />)}</div>
      )}
    </div>
  );
}
