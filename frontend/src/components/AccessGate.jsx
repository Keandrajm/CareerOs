import React, { useState } from 'react';
import { getAccessKey, setAccessKey } from '../security.js';

export default function AccessGate({ children }) {
  const [key, setKey] = useState(getAccessKey());
  const [draft, setDraft] = useState('');

  if (key) return children;

  function handleSubmit(e) {
    e.preventDefault();
    const value = draft.trim();
    if (!value) return;
    setAccessKey(value);
    setKey(value);
  }

  return (
    <div className="access-shell">
      <form className="access-card" onSubmit={handleSubmit}>
        <div className="logo" style={{ marginBottom: '0.85rem' }}>CO</div>
        <h1>CareerOS Access</h1>
        <p>Enter your private dashboard key. It is stored only in this browser and sent as a request header to the backend.</p>
        <input
          type="password"
          autoComplete="current-password"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Private access key"
          autoFocus
        />
        <button className="btn btn-primary" type="submit">Unlock Dashboard</button>
      </form>
    </div>
  );
}
