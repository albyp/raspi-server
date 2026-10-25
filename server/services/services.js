import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { probeHttp } from './probe.js';
import { tailscaleLookup } from './tailscale.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = process.env.SERVICES_CONFIG || path.join(__dirname, '../../services.json');

// Non-docker services to probe: native ones on the Pi and ones on other machines (rocky)
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (error) {
    console.warn(`Could not read ${CONFIG_PATH}:`, error.message);
    return { hosts: [] };
  }
}

// Extra details per service kind, beyond up/down
const DETAILS = {
  async jellyfin(base) {
    const res = await probeHttp(`${base}/System/Info/Public`, { json: true });
    if (!res.body) return null;
    return { version: res.body.Version, serverName: res.body.ServerName };
  },

  async qbittorrent(base, svc) {
    const user = svc.auth && process.env[`${svc.auth}_USER`];
    const pass = svc.auth && process.env[`${svc.auth}_PASS`];
    const headers = { Referer: base };
    if (user && pass) {
      const login = await fetch(`${base}/api/v2/auth/login`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: user, password: pass })
      });
      const cookie = login.headers.get('set-cookie')?.split(';')[0];
      if (cookie) headers.Cookie = cookie;
    }
    const info = await probeHttp(`${base}/api/v2/transfer/info`, { json: true, headers });
    if (!info.body) return { needsAuth: !user };
    const torrents = await probeHttp(`${base}/api/v2/torrents/info?filter=active`, { json: true, headers });
    return {
      dlSpeed: info.body.dl_info_speed,
      upSpeed: info.body.up_info_speed,
      connection: info.body.connection_status,
      activeTorrents: Array.isArray(torrents.body) ? torrents.body.length : null
    };
  }
};

async function probeService(host, svc, address) {
  const scheme = svc.https ? 'https' : 'http';
  const base = `${scheme}://${address}:${svc.port}`;
  const res = await probeHttp(`${base}${svc.healthPath || '/'}`, { timeout: 3000 });
  let details = null;
  if (res.ok !== null && DETAILS[svc.kind]) {
    details = await DETAILS[svc.kind](base, svc).catch(err => ({ error: err.message }));
  }
  return {
    name: svc.name,
    kind: svc.kind || null,
    // Links use the host name so they resolve from the browser (MagicDNS / LAN)
    // (local hosts get rebuilt client-side from window.location.hostname)
    url: `${scheme}://${host.linkHost || host.host}:${svc.port}${svc.path || '/'}`,
    scheme,
    port: svc.port,
    path: svc.path || '/',
    up: res.ok !== null,
    status: res.status,
    latency: res.latency ?? null,
    error: res.error || null,
    details
  };
}

export async function getServicesInfo(tailscale) {
  const { hosts = [] } = loadConfig();
  const lookup = tailscaleLookup(tailscale);

  return Promise.all(hosts.map(async (host) => {
    const node = host.local ? null : lookup.get(host.host.toLowerCase());
    // Prefer the tailscale IP when we know it; fall back to normal DNS
    const address = host.address || (host.local ? '127.0.0.1' : node?.ip || host.host);
    const services = await Promise.all((host.services || []).map(svc => probeService(host, svc, address)));
    return {
      name: host.name || host.host,
      host: host.host,
      local: !!host.local,
      description: host.description || null,
      tailscale: node ? { online: node.online, connection: node.connection, os: node.os } : null,
      services
    };
  }));
}
