import React from 'react';
import { FiExternalLink } from 'react-icons/fi';
import ServiceIcon from './ServiceIcon';
import { localUrl } from '../format';

function containerColor(c) {
  if (c.state !== 'running') return c.state === 'exited' ? 'red' : 'amber';
  if (c.health === 'unhealthy') return 'red';
  if (c.health === 'health: starting') return 'amber';
  return 'green';
}

function linkFor(c) {
  if (!c.link) return null;
  return c.link.url || localUrl(c.link);
}

function linkLabel(c, href) {
  if (!href) return c.state === 'running' ? 'no web UI' : c.state;
  const url = new URL(href);
  const path = url.pathname !== '/' ? url.pathname : '';
  return url.port ? `:${url.port}${path}` : url.host + path;
}

export default function DockerStatus({ data }) {
  if (!data) return <section className="widget">Loading Docker status...</section>;

  if (data.error) {
    return (
      <section className="widget docker-status wide">
        <h2>Docker</h2>
        <div className="widget-error">Docker unavailable: {data.error}</div>
      </section>
    );
  }

  const running = data.filter(c => c.state === 'running').length;

  return (
    <section className="widget docker-status wide">
      <h2>
        Docker
        <span className="h2-meta">{running}/{data.length} running</span>
      </h2>
      {data.length === 0 ? (
        <div className="empty">No containers found</div>
      ) : (
        <div className="app-grid">
          {data.map(c => {
            const href = linkFor(c);
            const Tag = href ? 'a' : 'div';
            return (
              <Tag
                key={c.id}
                className={`app-card${href ? ' linked' : ''}`}
                {...(href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {})}
                title={`${c.image}\n${c.status}${c.ports.length ? `\nPorts: ${c.ports.join(', ')}` : ''}`}
              >
                <ServiceIcon hint={`${c.image} ${c.name}`} />
                <div className="app-body">
                  <div className="app-name">
                    <span className={`dot ${containerColor(c)}`} />
                    {c.displayName}
                  </div>
                  <div className="app-sub">
                    {linkLabel(c, href)}
                    <span className="app-status"> · {c.status.replace(/\s*\(.*\)/, '')}</span>
                  </div>
                </div>
                {href && <FiExternalLink className="app-open" aria-hidden="true" />}
              </Tag>
            );
          })}
        </div>
      )}
    </section>
  );
}
