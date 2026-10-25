import http from 'http';

const SOCKET = process.env.TAILSCALE_SOCKET || '/var/run/tailscale/tailscaled.sock';

// Talk to tailscaled's LocalAPI directly over its unix socket — no CLI needed in the container
function localApi(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({
      socketPath: SOCKET,
      path,
      headers: { Host: 'local-tailscaled.sock' },
      timeout: 3000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`LocalAPI ${res.statusCode}: ${data.trim()}`));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('LocalAPI timeout')));
    req.on('error', reject);
  });
}

const ZERO_TIME = '0001-01-01T00:00:00Z';

function mapNode(node, { isSelf = false, exitNodeId = null } = {}) {
  let connection = null;
  if (isSelf) connection = 'self';
  else if (!node.Online) connection = 'offline';
  else if (node.CurAddr) connection = 'direct';
  else if (node.Relay && node.Active) connection = 'relay';
  else connection = 'idle';

  return {
    id: node.ID,
    hostName: node.HostName,
    dnsName: node.DNSName?.split('.')[0] || node.HostName,
    ip: node.TailscaleIPs?.[0] || null,
    os: node.OS,
    online: isSelf ? true : !!node.Online,
    active: !!node.Active,
    connection,
    curAddr: node.CurAddr || null,
    relay: node.Relay || null,
    rxBytes: node.RxBytes || 0,
    txBytes: node.TxBytes || 0,
    lastSeen: node.LastSeen && node.LastSeen !== ZERO_TIME ? node.LastSeen : null,
    lastHandshake: node.LastHandshake && node.LastHandshake !== ZERO_TIME ? node.LastHandshake : null,
    keyExpiry: node.KeyExpiry || null,
    exitNodeOption: !!node.ExitNodeOption,
    isExitNode: !!exitNodeId && node.ID === exitNodeId,
    tags: node.Tags || []
  };
}

export async function getTailscaleInfo() {
  try {
    const status = await localApi('/localapi/v0/status');
    const exitNodeId = status.ExitNodeStatus?.ID || null;
    const self = mapNode(status.Self, { isSelf: true });
    const peers = Object.values(status.Peer || {})
      .map(p => mapNode(p, { exitNodeId }))
      .sort((a, b) => Number(b.online) - Number(a.online) || a.dnsName.localeCompare(b.dnsName));

    return {
      reachable: true,
      backendState: status.BackendState,
      version: status.Version?.split('-')[0],
      tailnet: status.CurrentTailnet?.Name || null,
      magicDNSSuffix: status.MagicDNSSuffix || status.CurrentTailnet?.MagicDNSSuffix || null,
      health: status.Health || [],
      self,
      peers,
      online: peers.filter(p => p.online).length + 1,
      total: peers.length + 1
    };
  } catch (error) {
    console.error('Error getting Tailscale info:', error.message);
    return { reachable: false, error: error.message };
  }
}

// hostname -> tailscale IP, for probing remote services without relying on MagicDNS
export function tailscaleLookup(info) {
  const map = new Map();
  if (!info?.reachable) return map;
  for (const node of [info.self, ...info.peers]) {
    if (node.ip) {
      map.set(node.dnsName.toLowerCase(), node);
      map.set(node.hostName.toLowerCase(), node);
    }
  }
  return map;
}
