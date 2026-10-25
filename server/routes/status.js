import express from 'express';
import os from 'os';
import { getSystemInfo } from '../services/system.js';
import { getDockerInfo } from '../services/docker.js';
import { getHomeAssistantInfo, callHAService } from '../services/homeassistant.js';
import { getNetworkInfo } from '../services/network.js';
import { getTailscaleInfo } from '../services/tailscale.js';
import { getSyncthingInfo } from '../services/syncthing.js';
import { getServicesInfo } from '../services/services.js';

const router = express.Router();

// One failing source shouldn't blank the whole dashboard
async function safe(name, fn) {
  try {
    return await fn();
  } catch (error) {
    console.error(`Error fetching ${name}:`, error.message);
    return { error: error.message };
  }
}

router.get('/status', async (req, res) => {
  const tailscalePromise = safe('tailscale', getTailscaleInfo);

  const [system, docker, homeassistant, network, tailscale, syncthing, services] = await Promise.all([
    safe('system', getSystemInfo),
    safe('docker', getDockerInfo),
    safe('homeassistant', getHomeAssistantInfo),
    safe('network', getNetworkInfo),
    tailscalePromise,
    safe('syncthing', getSyncthingInfo),
    // Remote services resolve hostnames via tailscale status
    tailscalePromise.then(ts => safe('services', () => getServicesInfo(ts)))
  ]);

  res.json({
    hostname: os.hostname(),
    generatedAt: new Date().toISOString(),
    system,
    docker,
    homeassistant,
    network,
    tailscale,
    syncthing,
    services
  });
});

router.post('/ha/service', async (req, res) => {
  const { domain, service, entity_id } = req.body;
  if (!domain || !service || !entity_id) {
    return res.status(400).json({ error: 'domain, service, and entity_id are required' });
  }
  try {
    await callHAService(domain, service, entity_id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error calling HA service:', error);
    res.status(502).json({ error: error.message });
  }
});

router.get('/health', (req, res) => res.json({ ok: true }));

export default router;
