import fetch from 'node-fetch';

const HA_BASE_URL = process.env.HA_BASE_URL || 'http://localhost:8123';
const HA_TOKEN = process.env.HA_TOKEN;
const HA_ENTITY_IDS = process.env.HA_ENTITY_IDS ? process.env.HA_ENTITY_IDS.split(',') : [];

export async function getHomeAssistantInfo() {
  try {
    if (!HA_TOKEN) {
      return { reachable: false, error: 'No HA token configured' };
    }

    const response = await fetch(`${HA_BASE_URL}/api/states`, {
      headers: {
        'Authorization': `Bearer ${HA_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HA API returned ${response.status}`);
    }

    const allStates = await response.json();

    // Filter to configured entity IDs
    const states = HA_ENTITY_IDS.length > 0
      ? allStates.filter(state => HA_ENTITY_IDS.includes(state.entity_id))
      : allStates.slice(0, 20); // Default to first 20 if no filter

    return {
      reachable: true,
      states
    };
  } catch (error) {
    console.error('Error getting Home Assistant info:', error);
    return { reachable: false, error: error.message };
  }
}

export async function callHAService(domain, service, entity_id) {
  if (!HA_TOKEN) throw new Error('No HA token configured');

  const response = await fetch(`${HA_BASE_URL}/api/services/${domain}/${service}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HA_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ entity_id })
  });

  if (!response.ok) {
    throw new Error(`HA API returned ${response.status}`);
  }
}