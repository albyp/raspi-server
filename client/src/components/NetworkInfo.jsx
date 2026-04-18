import React from 'react';

export default function NetworkInfo({ data }) {
  if (!data) return <div className="widget">Loading network info...</div>;

  return (
    <div className="widget network-info">
      <h2>Network</h2>
      <div className="network-details">
        <div className="network-item">
          <label>Tailscale IP</label>
          <div className="value">{data.tailscaleIp || 'N/A'}</div>
        </div>
        <div className="network-item">
          <label>Tailscale Status</label>
          <div className={`value status ${data.tailscaleStatus}`}>
            {data.tailscaleStatus}
          </div>
        </div>
        <div className="network-item">
          <label>Local IP</label>
          <div className="value">{data.localIp || 'N/A'}</div>
        </div>
        <div className="network-item">
          <label>Hostname</label>
          <div className="value">{window.location.hostname}</div>
        </div>
      </div>
    </div>
  );
}