import React from 'react';

export default function FilterBar({ filters, onChange, onReset }) {
  const handle = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="filter-bar">
      <input
        type="text"
        placeholder="🔍 Search title, company..."
        value={filters.search || ''}
        onChange={handle('search')}
      />
      <select value={filters.label || ''} onChange={handle('label')}>
        <option value="">All Labels</option>
        <option value="green">🟢 Green Light</option>
        <option value="yellow">🟡 Yellow Light</option>
        <option value="red">🔴 Red Light</option>
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
      <input
        type="number"
        placeholder="Min score"
        value={filters.minScore || ''}
        onChange={handle('minScore')}
        style={{ width: 100 }}
      />
      <button className="btn btn-secondary btn-sm" onClick={onReset}>Reset</button>
    </div>
  );
}
