import React from 'react';
import { OsIcon } from './ServiceIcon';
import { formatBytes, timeAgo } from '../format';

const CONNECTION_LABEL = {
  self: 'this device',
  direct: 'direct',
  relay: 'relay',
  idle: 'idle',
  offline: 'offline'
};

function connectionColor(node) {
  if (!node.online) return 'grey';
  if (node.connection === 'relay') return 'amber';
  return 'green';
}

function Detail({ node }) {
  if (node.connection === 'self') return <span className="muted">this Pi</span>;
  if (!node.online) return <span className="muted">last seen {timeAgo(node.lastSeen)}</span>;
  if (node.connection === 'direct') return <span className="muted mono">{node.curAddr}</span>;
  if (node.connection === 'relay') return <span className="muted">via DERP {node.relay}</span>;
  return <span className="muted">online</span>;
}

export default function TailscaleStatus({ data }) {
  if (!data) return <section className="widget">Loading Tailscale...</section>;

  if (!data.reachable) {
    return (
      <section className="widget tailscale wide">
        <h2>Tailscale</h2>
        <div className="widget-error">Not reachable: {data.error}</div>
      </section>
    );
  }

  const nodes = [data.self, ...data.peers];

  return (
    <section className="widget tailscale wide">
      <h2>
        Tailscale
        <span className="h2-meta">
          <span className={data.backendState === 'Running' ? 'text-green' : 'text-red'}>{data.backendState}</span>
          {' · '}{data.online}/{data.total} online
          {data.version && ` · v${data.version}`}
        </span>
      </h2>
      {data.health?.length > 0 && (
        <ul className="ts-health">
          {data.health.map((h, i) => <li key={i}>{h}</li>)}
        </ul>
      )}
      <div className="table-wrap">
        <table className="ts-table">
          <thead>
            <tr>
              <th>Device</th>
              <th>IP</th>
              <th>Connection</th>
              <th className="hide-sm">Traffic</th>
              <th className="hide-sm">Flags</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map(node => (
              <tr key={node.id} className={node.online ? '' : 'offline'}>
                <td>
                  <div className="ts-device">
                    <OsIcon os={node.os} />
                    <span className="ts-name">{node.dnsName}</span>
                  </div>
                </td>
                <td className="mono">{node.ip}</td>
                <td>
                  <div className="ts-conn">
                    <span className={`pill ${connectionColor(node)}`}>{CONNECTION_LABEL[node.connection]}</span>
                    <Detail node={node} />
                  </div>
                </td>
                <td className="hide-sm mono muted">
                  {node.rxBytes || node.txBytes ? `↓${formatBytes(node.rxBytes)} ↑${formatBytes(node.txBytes)}` : '—'}
                </td>
                <td className="hide-sm">
                  {node.isExitNode && <span className="tag accent">exit node in use</span>}
                  {node.exitNodeOption && !node.isExitNode && <span className="tag">exit node</span>}
                  {node.tags.map(t => <span key={t} className="tag">{t.replace('tag:', '')}</span>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
