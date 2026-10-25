import React from 'react';
import SystemStats from './components/SystemStats';
import DockerStatus from './components/DockerStatus';
import HAWidget from './components/HAWidget';
import HostServices from './components/HostServices';
import TailscaleStatus from './components/TailscaleStatus';
import SyncthingStatus from './components/SyncthingStatus';
import HumidorStatus from './components/HumidorStatus';
import useDashboard from './hooks/useDashboard';
import { usePrefs } from './prefs';
import { FiSun, FiMoon, FiEye, FiEyeOff } from 'react-icons/fi';
import './App.css';

function App() {
  const { data, loading, error, lastUpdated, isStale } = useDashboard();
  const { theme, toggleTheme, redacted, toggleRedact, redact } = usePrefs();

  if (loading && !data) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const tsSelf = data?.tailscale?.self;

  return (
    <div className={`dashboard${isStale ? ' stale' : ''}`}>
      <header className="dashboard-header">
        <div>
          <h1>{data?.hostname || 'raspi'}</h1>
          <div className="header-ips mono">
            {data?.network?.localIp && <span>LAN {redact(data.network.localIp)}</span>}
            {tsSelf?.ip && <span>TS {redact(tsSelf.ip)}</span>}
          </div>
        </div>
        <div className="header-right">
          {lastUpdated && (
            <div className={`last-updated${isStale ? ' stale' : ''}`}>
              <span className={`dot ${isStale ? 'amber' : 'green'} pulse`} />
              {lastUpdated}{isStale ? ' — connection lost' : ''}
            </div>
          )}
          <div className="header-actions">
            <button
              className="icon-btn"
              onClick={toggleRedact}
              aria-pressed={redacted}
              title={redacted ? 'Show IP addresses' : 'Hide IP addresses (for screenshots)'}
            >
              {redacted ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
              <span className="btn-label">{redacted ? 'Redacted' : 'Redact'}</span>
            </button>
            <button
              className="icon-btn"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <FiMoon aria-hidden="true" /> : <FiSun aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        <SystemStats data={data?.system} />
        <HumidorStatus data={data?.humidor} />
        <DockerStatus data={data?.docker} />
        <HostServices data={data?.services} />
        <SyncthingStatus data={data?.syncthing} />
        <TailscaleStatus data={data?.tailscale} />
        <HAWidget data={data?.homeassistant} />
      </div>

      {error && (
        <div className="error">
          Error loading data: {error}
        </div>
      )}
    </div>
  );
}

export default App;
