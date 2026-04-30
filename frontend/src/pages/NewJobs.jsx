import React, { useEffect, useState, useCallback } from 'react';
import Dashboard from '../components/Dashboard.jsx';
import JobCard from '../components/JobCard.jsx';
import FilterBar from '../components/FilterBar.jsx';
import { getJobs } from '../api.js';

const EMPTY_FILTERS = { search: '', label: '', status: 'new', source: '', minScore: '' };

export default function NewJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const load = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (filters.search)   params.search   = filters.search;
    if (filters.label)    params.label    = filters.label;
    if (filters.source)   params.source   = filters.source;
    if (filters.minScore) params.minScore = filters.minScore;
    // Default: new jobs only
    params.status = filters.status || 'new';
    const res = await getJobs(params);
    setJobs(res.data.jobs || []);
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-header">
        <h1>🆕 New Jobs</h1>
        <p>Jobs discovered today that need your review.</p>
      </div>
      <Dashboard />
      <FilterBar filters={filters} onChange={setFilters} onReset={() => setFilters(EMPTY_FILTERS)} />
      {loading ? (
        <div className="loading">Loading jobs…</div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No new jobs</h3>
          <p>Click "Load Sample Jobs" in the sidebar to populate test data, or run a scan.</p>
        </div>
      ) : (
        <div className="job-grid">
          {jobs.map(job => <JobCard key={job.id} job={job} onRefresh={load} />)}
        </div>
      )}
    </div>
  );
}
