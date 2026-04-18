import React from 'react';
import SystemStats from './components/SystemStats';
import DockerStatus from './components/DockerStatus';
import HAWidget from './components/HAWidget';
import NetworkInfo from './components/NetworkInfo';
import QuickLinks from './components/QuickLinks';
import useDashboard from './hooks/useDashboard';
import './App.css';

function App() {
  const { data, loading, error, lastUpdated, isStale } = useDashboard();

  if (loading && !data) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className={`dashboard${isStale ? ' stale' : ''}`}>
      <header className="dashboard-header">
        <h1>Pi Dashboard</h1>
        {lastUpdated && (
          <div className={`last-updated${isStale ? ' stale' : ''}`}>
            Last updated: {lastUpdated}{isStale ? ' — connection lost' : ''}
          </div>
        )}
      </header>

      <div className="dashboard-grid">
        <SystemStats data={data?.system} />
        <DockerStatus data={data?.docker} />
        <HAWidget data={data?.homeassistant} />
        <NetworkInfo data={data?.network} />
        <QuickLinks />
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