import React, { useEffect, useState, useCallback } from 'react';
import JobCard from '../components/JobCard.jsx';
import FilterBar from '../components/FilterBar.jsx';
import { getJobs } from '../api.js';
import { toJobQuery } from '../filterParams.js';

const EMPTY = { search: '', source: '', minScore: '', company: '', title: '', remoteStatus: '', salaryMin: '', salaryMax: '', postedAfter: '', postedBefore: '' };

export default function Approved() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getJobs(toJobQuery(filters, { status: 'approved' }));
    setJobs(res.data.jobs || []);
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-header">
        <h1>Approved to Apply</h1>
        <p>Jobs you reviewed and approved. CareerOS still does not submit anything automatically.</p>
      </div>
      <FilterBar filters={filters} onChange={setFilters} onReset={() => setFilters(EMPTY)} />
      {loading ? <div className="loading">Loading...</div> : jobs.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">OK</div><h3>No approved jobs yet</h3><p>Approve jobs from Green Light, Yellow Light, or packet views.</p></div>
      ) : (
        <div className="job-grid">{jobs.map(j => <JobCard key={j.id} job={j} onRefresh={load} />)}</div>
      )}
    </div>
  );
}
