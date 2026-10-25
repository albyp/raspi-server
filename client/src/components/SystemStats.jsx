import React from 'react';
import { formatUptime } from '../format';

function level(pct, warn = 70, crit = 90) {
  if (pct >= crit) return 'red';
  if (pct >= warn) return 'amber';
  return 'green';
}

function Stat({ label, value, sub, pct, color }) {
  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${color || ''}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {pct != null && (
        <div className="bar">
          <div className={`fill ${color || ''}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      )}
    </div>
  );
}

export default function SystemStats({ data }) {
  if (!data) return <section className="widget">Loading system stats...</section>;
  if (data.error) {
    return (
      <section className="widget wide">
        <div className="widget-error">System stats unavailable: {data.error}</div>
      </section>
    );
  }

  const tempColor = data.temp == null ? '' : data.temp < 60 ? 'green' : data.temp < 75 ? 'amber' : 'red';

  return (
    <section className="widget system-stats wide">
      <div className="stat-row">
        <Stat
          label="CPU"
          value={`${Math.round(data.cpu)}%`}
          sub={data.load ? `load ${data.load.join(' ')}` : null}
          pct={data.cpu}
          color={level(data.cpu)}
        />
        <Stat
          label="Memory"
          value={`${data.ram.percent}%`}
          sub={`${data.ram.used} / ${data.ram.total} GB`}
          pct={data.ram.percent}
          color={level(data.ram.percent, 75, 90)}
        />
        <Stat
          label="Disk"
          value={`${data.disk.percent}%`}
          sub={`${data.disk.used} / ${data.disk.total} GB`}
          pct={data.disk.percent}
          color={level(data.disk.percent, 80, 92)}
        />
        <Stat
          label="Temp"
          value={data.temp ? `${data.temp}°C` : 'N/A'}
          sub={data.temp ? (tempColor === 'green' ? 'normal' : tempColor === 'amber' ? 'warm' : 'hot') : null}
          color={tempColor}
        />
        <Stat label="Uptime" value={formatUptime(data.uptime)} sub={data.cores ? `${data.cores} cores` : null} />
      </div>
    </section>
  );
}
