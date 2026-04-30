import React, { useState } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import NewJobs from './pages/NewJobs.jsx';
import GreenLight from './pages/GreenLight.jsx';
import YellowLight from './pages/YellowLight.jsx';
import Rejected from './pages/Rejected.jsx';
import Packets from './pages/Packets.jsx';
import Drafts from './pages/Drafts.jsx';
import ManualApply from './pages/ManualApply.jsx';
import Approved from './pages/Approved.jsx';
import Submitted from './pages/Submitted.jsx';
import BotLogs from './pages/BotLogs.jsx';
import AccessGate from './components/AccessGate.jsx';
import { clearAccessKey } from './security.js';
import { triggerScan, ingestSample } from './api.js';

const NAV = [
  { to: '/', label: 'New Jobs' },
  { to: '/green-light', label: 'Green Light' },
  { to: '/yellow-light', label: 'Yellow Light' },
  { to: '/rejected', label: 'Rejected' },
  { to: '/packets', label: 'Packets' },
  { to: '/drafts', label: 'Drafts' },
  { to: '/manual-apply', label: 'Manual Apply' },
  { to: '/approved', label: 'Approved' },
  { to: '/submitted', label: 'Submitted' },
  { to: '/bot-logs', label: 'Bot Logs' },
];

export default function App() {
  const [scanning, setScanning] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleScan() {
    setScanning(true);
    try {
      await triggerScan();
      showToast('Scan triggered. Check Bot Logs for progress.');
    } catch (e) {
      showToast('Scan failed: ' + (e.response?.data?.error || e.message), 'error');
    } finally {
      setScanning(false);
    }
  }

  async function handleIngest() {
    setIngesting(true);
    try {
      const res = await ingestSample();
      showToast(`${res.data.inserted} sample jobs loaded.`);
      navigate('/');
    } catch (e) {
      showToast('Ingest failed: ' + (e.response?.data?.error || e.message), 'error');
    } finally {
      setIngesting(false);
    }
  }

  return (
    <AccessGate>
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="logo">CO</span>
          <span className="brand">CareerOS</span>
        </div>
        <nav className="nav-links">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-actions">
          <button className="btn btn-primary" onClick={handleScan} disabled={scanning}>
            {scanning ? 'Scanning...' : 'Run Scan'}
          </button>
          <button className="btn btn-secondary" onClick={handleIngest} disabled={ingesting}>
            {ingesting ? 'Loading...' : 'Load Sample Jobs'}
          </button>
          <button className="btn btn-secondary" onClick={() => { clearAccessKey(); window.location.reload(); }}>
            Lock
          </button>
        </div>
      </aside>

      <main className="main-content">
        {toast && (
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        )}
        <Routes>
          <Route path="/" element={<NewJobs />} />
          <Route path="/green-light" element={<GreenLight />} />
          <Route path="/yellow-light" element={<YellowLight />} />
          <Route path="/rejected" element={<Rejected />} />
          <Route path="/packets" element={<Packets />} />
          <Route path="/drafts" element={<Drafts />} />
          <Route path="/manual-apply" element={<ManualApply />} />
          <Route path="/approved" element={<Approved />} />
          <Route path="/submitted" element={<Submitted />} />
          <Route path="/bot-logs" element={<BotLogs />} />
        </Routes>
      </main>
    </div>
    </AccessGate>
  );
}
