import express from 'express';
import { getSystemInfo } from '../services/system.js';
import { getDockerInfo } from '../services/docker.js';
import { getHomeAssistantInfo, callHAService } from '../services/homeassistant.js';
import { getNetworkInfo } from '../services/network.js';

const router = express.Router();

router.get('/status', async (req, res) => {
  try {
    const [system, docker, homeassistant, network] = await Promise.all([
      getSystemInfo(),
      getDockerInfo(),
      getHomeAssistantInfo(),
      getNetworkInfo()
    ]);

    res.json({
      system,
      docker,
      homeassistant,
      network
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
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

export default router;