import React from 'react';

export default function ScoreBadge({ score, label }) {
  const cls = label === 'green' ? 'green' : label === 'yellow' ? 'yellow' : 'red';
  const display = score != null ? Math.round(score) : '?';
  return (
    <div className={`score-badge ${cls}`}>
      <span>{display}</span>
      <span className="score-label">/100</span>
    </div>
  );
}
