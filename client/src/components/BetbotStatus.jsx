import React from 'react';
import { FiTrendingUp } from 'react-icons/fi';
import { timeAgo } from '../format';

const LIVE_COLOR = { armed: 'green', disarmed: 'grey', halted_live: 'red' };

function dollars(cents, signed = false) {
  if (cents == null) return '—';
  const sign = cents < 0 ? '-' : signed && cents > 0 ? '+' : '';
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

const pnlColor = cents => (cents == null || cents === 0 ? '' : cents > 0 ? 'green' : 'red');

function Stat({ label, value, sub, color }) {
  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${color || ''}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function BetbotStatus({ data }) {
  if (!data) return <section className="widget">Loading betbot...</section>;

  const title = (
    <a className="h2-link" href="/betbot/" target="_blank" rel="noopener noreferrer">
      <FiTrendingUp /> Betbot
    </a>
  );

  if (!data.reachable || data.error) {
    return (
      <section className="widget betbot">
        <h2>{title}</h2>
        <div className="widget-error">{data.error || 'Not reachable'}</div>
      </section>
    );
  }

  const rec = data.recorder || {};
  const recorderOk = rec.process === 'running' && rec.freshness === 'fresh';
  const live = data.live || 'unknown';

  return (
    <section className="widget betbot">
      <h2>
        {title}
        <span className={`pill ${LIVE_COLOR[live] || 'amber'}`}>{live.replace('_', ' ')}</span>
      </h2>

      <div className="stat-row">
        <Stat label="Bank" value={dollars(data.remainingCents)}
          sub={data.kittyCents != null ? `of ${dollars(data.kittyCents)} armed` : 'not armed'} />
        <Stat label="Today" value={dollars(data.todayPnlCents, true)} color={pnlColor(data.todayPnlCents)}
          sub={`${data.todayBets} bet${data.todayBets === 1 ? '' : 's'}`} />
        <Stat label="Since arm" value={dollars(data.sinceArmPnlCents, true)} color={pnlColor(data.sinceArmPnlCents)} />
        <Stat label="Open" value={dollars(data.openLiabilityCents)}
          sub={`${data.openOrders} order${data.openOrders === 1 ? '' : 's'}`} />
      </div>

      <div className="st-device-head bb-recorder">
        <span className={`dot ${recorderOk ? 'green' : rec.process === 'running' ? 'amber' : 'red'}`} />
        <span className="st-name">Recorder</span>
        <span className="muted">
          {rec.process || 'unknown'} · {rec.freshness || '—'}
          {rec.ageSeconds != null && ` · ${Math.round(rec.ageSeconds)}s`}
          {rec.marketsToday != null && ` · ${rec.marketsToday} markets today`}
        </span>
      </div>
      {data.nextUp && (
        <div className="st-device-meta muted">
          Next: {data.nextUp.venue} {data.nextUp.race} · {new Date(data.nextUp.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
      {(data.reason || data.lastError) && (
        <div className="widget-error">{data.reason || data.lastError}</div>
      )}
      <div className="st-device-meta muted">updated {timeAgo(data.updatedAt)}</div>
    </section>
  );
}
