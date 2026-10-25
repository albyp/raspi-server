import Docker from 'dockerode';
import { probeHttp } from './probe.js';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Containers that don't publish ports (host networking) or whose UI lives on a sub-path.
// Override any of these per-container with labels:
//   dashboard.url   = ":8123/path" | "/admin" | "http://host:port/path"
//   dashboard.name  = "Pretty Name"
//   dashboard.hide  = "true"
const KNOWN_IMAGES = [
  { match: /home-assistant|homeassistant/, port: 8123, name: 'Home Assistant' },
  { match: /pihole/, path: '/admin', name: 'Pi-hole' },
  { match: /qbittorrent/, port: 8080, name: 'qBittorrent' },
  { match: /jellyfin/, port: 8096, name: 'Jellyfin' },
  { match: /portainer/, port: 9000, name: 'Portainer' },
  { match: /syncthing/, port: 8384, name: 'Syncthing' },
  { match: /grafana/, port: 3000, name: 'Grafana' },
  { match: /code-server/, port: 8443, name: 'Code Server' },
  { match: /telegram-bot-api/, name: 'Telegram Bot API', noWeb: true },
];

// Web UI detection result per container+port, so we don't hammer every port each poll
const probeCache = new Map();
const PROBE_TTL = 5 * 60 * 1000;

async function isWebUI(port) {
  const cached = probeCache.get(port);
  if (cached && Date.now() - cached.at < PROBE_TTL) return cached.web;
  const res = await probeHttp(`http://127.0.0.1:${port}/`, { timeout: 1500 });
  // A web UI answers with HTML or redirects somewhere (login pages etc.)
  const web = res.ok !== null && (res.isHtml || (res.status >= 300 && res.status < 400));
  probeCache.set(port, { web, at: Date.now() });
  return web;
}

function parseUrlLabel(label) {
  if (!label) return null;
  if (/^https?:\/\//.test(label)) return { url: label };
  const m = label.match(/^:?(\d+)?(\/.*)?$/);
  if (!m) return null;
  return { port: m[1] ? Number(m[1]) : null, path: m[2] || '/' };
}

async function resolveLink(container, known) {
  const labels = container.Labels || {};
  const fromLabel = parseUrlLabel(labels['dashboard.url']);
  if (fromLabel?.url) return fromLabel;

  const published = [...new Set(
    (container.Ports || [])
      .filter(p => p.PublicPort && p.Type === 'tcp')
      .map(p => p.PublicPort)
  )].sort((a, b) => a - b);

  const path = fromLabel?.path || known?.path || '/';
  if (fromLabel?.port) return { port: fromLabel.port, path };
  if (known?.noWeb && !fromLabel) return null;
  if (known?.port && (published.length === 0 || published.includes(known.port))) {
    return { port: known.port, path };
  }

  for (const port of published) {
    if (await isWebUI(port)) return { port, path };
  }
  return null;
}

function friendlyName(name) {
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export async function getDockerInfo() {
  try {
    const containers = await docker.listContainers({ all: true });

    const result = await Promise.all(containers.map(async (c) => {
      const labels = c.Labels || {};
      if (labels['dashboard.hide'] === 'true') return null;

      const name = c.Names[0].replace('/', '');
      const known = KNOWN_IMAGES.find(k => k.match.test(c.Image) || k.match.test(name));
      const running = c.State === 'running';
      const link = running ? await resolveLink(c, known) : null;
      const health = c.Status.match(/\((healthy|unhealthy|health: starting)\)/)?.[1] || null;

      return {
        id: c.Id.slice(0, 12),
        name,
        displayName: labels['dashboard.name'] || known?.name || friendlyName(name),
        image: c.Image,
        state: c.State,
        status: c.Status,
        health,
        network: c.HostConfig?.NetworkMode,
        project: labels['com.docker.compose.project'] || null,
        ports: [...new Set((c.Ports || []).filter(p => p.PublicPort).map(p => `${p.PublicPort}/${p.Type}`))],
        link
      };
    }));

    return result
      .filter(Boolean)
      .sort((a, b) => (a.state === 'running' ? 0 : 1) - (b.state === 'running' ? 0 : 1) || a.displayName.localeCompare(b.displayName));
  } catch (error) {
    console.error('Error getting Docker info:', error.message);
    return { error: error.message };
  }
}
