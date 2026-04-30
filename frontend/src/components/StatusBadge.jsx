import React from 'react';

const STATUS_LABELS = {
  new:          'New',
  approved:     'Approved',
  rejected:     'Rejected',
  saved:        'Saved',
  packet_ready: 'Packet Ready',
  self_applied: 'Self-Applied',
  unscored:     'Unscored'
};

export default function StatusBadge({ status }) {
  const cls = `status-badge status-${status || 'new'}`;
  return <span className={cls}>{STATUS_LABELS[status] || status || 'New'}</span>;
}
