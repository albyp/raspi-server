import React, { useState } from 'react';
import { FiBatteryCharging, FiBattery, FiAlertTriangle } from 'react-icons/fi';
import { timeAgo } from '../format';

const LEVEL_COLOR = { good: 'green', warning: 'amber', critical: 'red', stale: 'grey' };

const W = 300;
const H = 64;

function formatClock(t) {
  return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 24h humidity line with the target band shaded; hover shows the reading at that time
function HumidityTrend({ points, band }) {
  const [hover, setHover] = useState(null);
  if (points.length < 2) return <div className="hd-trend empty-trend muted">No history yet</div>;

  const t0 = points[0][0];
  const t1 = points[points.length - 1][0];
  const values = points.map(p => p[1]);
  // Keep the band in view even when readings sit well inside it
  const lo = Math.floor(Math.min(band.min - 3, ...values) - 1);
  const hi = Math.ceil(Math.max(band.max + 3, ...values) + 1);
  const x = t => ((t - t0) / (t1 - t0 || 1)) * W;
  const y = v => H - ((v - lo) / (hi - lo)) * H;

  const d = points.map(([t, v], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join('');

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = t0 + ((e.clientX - rect.left) / rect.width) * (t1 - t0);
    let nearest = points[0];
    for (const p of points) if (Math.abs(p[0] - t) < Math.abs(nearest[0] - t)) nearest = p;
    setHover({ point: nearest, left: (x(nearest[0]) / W) * 100 });
  };

  return (
    <div className="hd-trend" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
        aria-label={`Humidity over 24 hours, ${Math.min(...values).toFixed(1)}% to ${Math.max(...values).toFixed(1)}%`}>
        <rect className="hd-band" x="0" width={W} y={y(band.max)} height={y(band.min) - y(band.max)} />
        <line className="hd-band-edge" x1="0" x2={W} y1={y(band.max)} y2={y(band.max)} />
        <line className="hd-band-edge" x1="0" x2={W} y1={y(band.min)} y2={y(band.min)} />
        <path className="hd-line" d={d} />
        {hover && (
          <>
            <line className="hd-cross" x1={x(hover.point[0])} x2={x(hover.point[0])} y1="0" y2={H} />
            <circle className="hd-marker" cx={x(hover.point[0])} cy={y(hover.point[1])} r="4" />
          </>
        )}
      </svg>
      {hover && (
        <div className="hd-tooltip" style={{ left: `${Math.min(Math.max(hover.left, 12), 88)}%` }}>
          <strong>{hover.point[1].toFixed(1)}%</strong> <span className="muted">{formatClock(hover.point[0])}</span>
        </div>
      )}
      <div className="hd-axis muted">
        <span>24h ago</span>
        <span>{band.min}–{band.max}% target</span>
        <span>now</span>
      </div>
    </div>
  );
}

function Humidor({ h, limits }) {
  const color = LEVEL_COLOR[h.status.level];
  const BatteryIcon = h.battery != null && h.battery < limits.lowBattery ? FiBattery : FiBatteryCharging;

  return (
    <div className={`hd-card ${h.status.level}`}>
      <div className="hd-head">
        <span className="hd-name">{h.name}</span>
        <span className={`pill ${color}`}>
          {h.status.level !== 'good' && <FiAlertTriangle aria-hidden="true" />} {h.status.label}
        </span>
      </div>

      <div className="hd-readings">
        <div>
          <div className="stat-label">Humidity</div>
          <div className="hd-value">{h.humidity != null ? h.humidity.toFixed(1) : '—'}<span>%</span></div>
        </div>
        <div>
          <div className="stat-label">Temp</div>
          <div className="hd-value">{h.temperature != null ? h.temperature.toFixed(1) : '—'}<span>°C</span></div>
        </div>
        {h.range24h && (
          <div className="hd-range">
            <div className="stat-label">24h RH</div>
            <div className="mono muted">{h.range24h.min.toFixed(1)}–{h.range24h.max.toFixed(1)}%</div>
          </div>
        )}
      </div>

      <HumidityTrend points={h.history} band={limits.rh} />

      <div className="hd-foot muted">
        <span><BatteryIcon aria-hidden="true" /> {h.battery != null ? `${h.battery}%` : '—'}</span>
        <span>updated {timeAgo(h.lastUpdated)}</span>
      </div>
    </div>
  );
}

export default function HumidorStatus({ data }) {
  if (!data) return <section className="widget">Loading humidors...</section>;

  if (!data.reachable) {
    return (
      <section className="widget humidor">
        <h2>Humidors</h2>
        <div className="widget-error">{data.error || 'Home Assistant not reachable'}</div>
      </section>
    );
  }
  if (data.humidors.length === 0) return null;

  const ok = data.humidors.filter(h => h.status.level === 'good').length;

  return (
    <section className="widget humidor wide">
      <h2>
        Humidors
        <span className="h2-meta">{ok}/{data.humidors.length} in range · Govee via Home Assistant</span>
      </h2>
      <div className="hd-grid">
        {data.humidors.map(h => <Humidor key={h.id} h={h} limits={data.limits} />)}
      </div>
    </section>
  );
}
