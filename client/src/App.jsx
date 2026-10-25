import React from 'react';
import SystemStats from './components/SystemStats';
import DockerStatus from './components/DockerStatus';
import HAWidget from './components/HAWidget';
import HostServices from './components/HostServices';
import TailscaleStatus from './components/TailscaleStatus';
import SyncthingStatus from './components/SyncthingStatus';
import HumidorStatus from './components/HumidorStatus';
import useDashboard from './hooks/useDashboard';
import './App.css';

function App() {
  const { data, loading, error, lastUpdated, isStale } = useDashboard();

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
            {data?.network?.localIp && <span>LAN {data.network.localIp}</span>}
            {tsSelf?.ip && <span>TS {tsSelf.ip}</span>}
          </div>
        </div>
        {lastUpdated && (
          <div className={`last-updated${isStale ? ' stale' : ''}`}>
            <span className={`dot ${isStale ? 'amber' : 'green'} pulse`} />
            {lastUpdated}{isStale ? ' — connection lost' : ''}
          </div>
        )}
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
