import React from 'react';

export default function FilterBar({ filters, onChange, onReset }) {
  const handle = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="filter-bar">
      <input
        type="text"
        placeholder="Search title, company..."
        value={filters.search || ''}
        onChange={handle('search')}
      />
      <input
        type="text"
        placeholder="Job title"
        value={filters.title || ''}
        onChange={handle('title')}
      />
      <input
        type="text"
        placeholder="Company"
        value={filters.company || ''}
        onChange={handle('company')}
      />
      <select value={filters.label || ''} onChange={handle('label')}>
        <option value="">All Labels</option>
        <option value="green">Green Light</option>
        <option value="yellow">Yellow Light</option>
        <option value="red">Red Light</option>
      </select>
      <select value={filters.status || ''} onChange={handle('status')}>
        <option value="">All Statuses</option>
        <option value="new">New</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="saved">Saved</option>
        <option value="packet_ready">Packet Ready</option>
        <option value="self_applied">Self-Applied</option>
      </select>
      <select value={filters.source || ''} onChange={handle('source')}>
        <option value="">All Sources</option>
        <option value="Greenhouse">Greenhouse</option>
        <option value="Lever">Lever</option>
        <option value="Ashby">Ashby</option>
      </select>
      <select value={filters.remoteStatus || ''} onChange={handle('remoteStatus')}>
        <option value="">Any Remote</option>
        <option value="remote">Remote</option>
        <option value="hybrid">Hybrid</option>
        <option value="unknown">Unknown</option>
      </select>
      <input
        type="number"
        placeholder="Min score"
        value={filters.minScore || ''}
        onChange={handle('minScore')}
        style={{ width: 100 }}
      />
      <input
        type="number"
        placeholder="Min salary"
        value={filters.salaryMin || ''}
        onChange={handle('salaryMin')}
        style={{ width: 110 }}
      />
      <input
        type="number"
        placeholder="Max salary"
        value={filters.salaryMax || ''}
        onChange={handle('salaryMax')}
        style={{ width: 110 }}
      />
      <input
        type="date"
        aria-label="Posted after"
        value={filters.postedAfter || ''}
        onChange={handle('postedAfter')}
        style={{ width: 140 }}
      />
      <input
        type="date"
        aria-label="Posted before"
        value={filters.postedBefore || ''}
        onChange={handle('postedBefore')}
        style={{ width: 140 }}
      />
      <button className="btn btn-secondary btn-sm" onClick={onReset}>Reset</button>
    </div>
  );
}
