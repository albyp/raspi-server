import React from 'react';

export default function SystemStats({ data }) {
  if (!data) return <div className="widget">Loading system stats...</div>;

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getTempColor = (temp) => {
    if (temp < 60) return 'green';
    if (temp < 75) return 'amber';
    return 'red';
  };

  return (
    <div className="widget system-stats">
      <h2>System Stats</h2>
      <div className="stats-grid">
        <div className="stat">
          <label>CPU</label>
          <div className="value">{data.cpu}%</div>
          <div className="bar">
            <div className="fill" style={{ width: `${data.cpu}%` }}></div>
          </div>
        </div>

        <div className="stat">
          <label>RAM</label>
          <div className="value">{data.ram.used}GB / {data.ram.total}GB ({data.ram.percent}%)</div>
          <div className="bar">
            <div className="fill" style={{ width: `${data.ram.percent}%` }}></div>
          </div>
        </div>

        <div className="stat">
          <label>Disk</label>
          <div className="value">{data.disk.used}GB / {data.disk.total}GB ({data.disk.percent}%)</div>
          <div className="bar">
            <div className="fill" style={{ width: `${data.disk.percent}%` }}></div>
          </div>
        </div>

        <div className="stat">
          <label>CPU Temp</label>
          <div className={`value temp ${getTempColor(data.temp)}`}>
            {data.temp ? `${data.temp}°C` : 'N/A'}
          </div>
        </div>

        <div className="stat">
          <label>Uptime</label>
          <div className="value">{formatUptime(data.uptime)}</div>
        </div>
      </div>
    </div>
  );
}