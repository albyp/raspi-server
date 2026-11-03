import express from 'express';
import os from 'os';
import { getSystemInfo } from '../services/system.js';
import { getDockerInfo } from '../services/docker.js';
import { getHomeAssistantInfo } from '../services/homeassistant.js';
import { getNetworkInfo } from '../services/network.js';
import { getTailscaleInfo } from '../services/tailscale.js';
import { getSyncthingInfo } from '../services/syncthing.js';
import { getServicesInfo } from '../services/services.js';
import { getHumidorInfo } from '../services/humidor.js';
import { getBetbotInfo } from '../services/betbot.js';

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

  const [system, docker, homeassistant, network, tailscale, syncthing, services, humidor, betbot] = await Promise.all([
    safe('system', getSystemInfo),
    safe('docker', getDockerInfo),
    safe('homeassistant', getHomeAssistantInfo),
    safe('network', getNetworkInfo),
    tailscalePromise,
    safe('syncthing', getSyncthingInfo),
    // Remote services resolve hostnames via tailscale status
    tailscalePromise.then(ts => safe('services', () => getServicesInfo(ts))),
    safe('humidor', getHumidorInfo),
    safe('betbot', getBetbotInfo)
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
    services,
    humidor,
    betbot
  });
});

router.get('/health', (req, res) => res.json({ ok: true }));

export default router;
