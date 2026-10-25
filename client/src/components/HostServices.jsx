import React from 'react';
import { FiExternalLink } from 'react-icons/fi';
import ServiceIcon from './ServiceIcon';
import { formatSpeed, localUrl } from '../format';

function Details({ svc }) {
  const d = svc.details;
  if (!svc.up) return <span className="muted">{svc.error || 'down'}</span>;
  if (!d) return <span className="muted">{svc.latency}ms</span>;
  if (svc.kind === 'jellyfin' && d.version) return <span className="muted">v{d.version} · {svc.latency}ms</span>;
  if (svc.kind === 'qbittorrent') {
    if (d.dlSpeed == null) return <span className="muted">{svc.latency}ms{d.needsAuth ? ' · add creds for stats' : ''}</span>;
    return (
      <span className="muted">
        ↓ {formatSpeed(d.dlSpeed)} · ↑ {formatSpeed(d.upSpeed)} · {d.activeTorrents} active
      </span>
    );
  }
  return <span className="muted">{svc.latency}ms</span>;
}

export default function HostServices({ data }) {
  if (!data) return <section className="widget">Loading services...</section>;
  if (data.error || !Array.isArray(data)) {
    return (
      <section className="widget">
        <h2>Services</h2>
        <div className="widget-error">{data.error || 'Unavailable'}</div>
      </section>
    );
  }

  return (
    <>
      {data.map(host => {
        const up = host.services.filter(s => s.up).length;
        const offline = host.tailscale && !host.tailscale.online;
        return (
          <section key={host.host} className="widget host-services">
            <h2>
              {host.name}
              <span className="h2-meta">
                {offline ? <span className="text-red">tailscale offline</span> : `${up}/${host.services.length} up`}
              </span>
            </h2>
            {host.description && <div className="widget-desc">{host.description}</div>}
            <div className="service-list">
              {host.services.map(svc => {
                const href = host.local ? localUrl(svc) : svc.url;
                return (
                  <a key={svc.name + svc.port} className="service-row" href={href} target="_blank" rel="noopener noreferrer">
                    <ServiceIcon hint={svc.kind || svc.name} />
                    <div className="service-body">
                      <div className="service-name">
                        <span className={`dot ${svc.up ? 'green' : 'red'}`} />
                        {svc.name}
                        <span className="muted mono"> :{svc.port}</span>
                      </div>
                      <Details svc={svc} />
                    </div>
                    <FiExternalLink className="app-open" aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
