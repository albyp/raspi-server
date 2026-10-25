import fs from 'fs';
import fetch from 'node-fetch';

const BASE_URL = () => process.env.SYNCTHING_URL || 'http://127.0.0.1:8384';
// Folder to report on — matched against folder label or ID
const FOLDER = () => process.env.SYNCTHING_FOLDER || 'Albyte (Obsidian)';

// API key from env, or read straight out of syncthing's config.xml (mounted read-only)
let cachedKey = null;
function apiKey() {
  if (process.env.SYNCTHING_API_KEY) return process.env.SYNCTHING_API_KEY;
  if (cachedKey) return cachedKey;
  const configPath = process.env.SYNCTHING_CONFIG || '/syncthing/config.xml';
  try {
    const xml = fs.readFileSync(configPath, 'utf8');
    cachedKey = xml.match(/<apikey>([^<]+)<\/apikey>/)?.[1] || null;
  } catch (error) {
    console.warn(`Could not read Syncthing config at ${configPath}:`, error.message);
  }
  return cachedKey;
}

async function st(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${BASE_URL()}${path}`, {
      headers: { 'X-API-Key': apiKey() },
      signal: controller.signal
    });
    if (res.status === 403) cachedKey = null; // key rotated — re-read next time
    if (!res.ok) throw new Error(`Syncthing ${path} returned ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function getSyncthingInfo() {
  try {
    if (!apiKey()) return { reachable: false, error: 'No Syncthing API key (set SYNCTHING_API_KEY or mount config.xml)' };

    const [folders, devices, connections, deviceStats, myStatus, version] = await Promise.all([
      st('/rest/config/folders'),
      st('/rest/config/devices'),
      st('/rest/system/connections'),
      st('/rest/stats/device'),
      st('/rest/system/status'),
      st('/rest/system/version')
    ]);

    const wanted = FOLDER().toLowerCase();
    const folder = folders.find(f => f.label?.toLowerCase() === wanted || f.id.toLowerCase() === wanted);
    if (!folder) {
      return { reachable: true, error: `Folder "${FOLDER()}" not found`, folders: folders.map(f => f.label || f.id) };
    }

    const myId = myStatus.myID;
    const deviceName = id => devices.find(d => d.deviceID === id)?.name || id.slice(0, 7);

    const [db, folderErrors] = await Promise.all([
      st(`/rest/db/status?folder=${encodeURIComponent(folder.id)}`),
      st(`/rest/folder/errors?folder=${encodeURIComponent(folder.id)}`).catch(() => ({ errors: [] }))
    ]);

    const peers = await Promise.all(
      folder.devices
        .filter(d => d.deviceID !== myId)
        .map(async ({ deviceID }) => {
          const conf = devices.find(d => d.deviceID === deviceID) || {};
          const conn = connections.connections?.[deviceID] || {};
          const completion = await st(`/rest/db/completion?folder=${encodeURIComponent(folder.id)}&device=${deviceID}`).catch(() => null);
          const connected = !!conn.connected;
          const pct = completion ? Math.floor(completion.completion * 10) / 10 : null;

          let state;
          if (conf.paused || conn.paused) state = 'paused';
          else if (!connected) state = 'disconnected';
          else if (completion && completion.needItems + (completion.needDeletes || 0) > 0) state = 'syncing';
          else state = 'up to date';

          return {
            id: deviceID.slice(0, 7),
            name: deviceName(deviceID),
            connected,
            state,
            address: conn.address || null,
            connectionType: conn.type || null,
            clientVersion: conn.clientVersion || null,
            completion: pct,
            needItems: completion?.needItems ?? null,
            needBytes: completion?.needBytes ?? null,
            lastSeen: deviceStats[deviceID]?.lastSeen || null
          };
        })
    );

    return {
      reachable: true,
      version: version.version,
      thisDevice: deviceName(myId),
      folder: {
        id: folder.id,
        label: folder.label,
        path: folder.path,
        type: folder.type,
        paused: folder.paused,
        state: db.state,
        stateChanged: db.stateChanged,
        files: db.localFiles,
        bytes: db.localBytes,
        needFiles: db.needFiles,
        needBytes: db.needBytes,
        errors: db.errors || 0,
        errorList: (folderErrors.errors || []).slice(0, 5)
      },
      devices: peers.sort((a, b) => a.name.localeCompare(b.name))
    };
  } catch (error) {
    console.error('Error getting Syncthing info:', error.message);
    return { reachable: false, error: error.name === 'AbortError' ? 'timeout' : error.message };
  }
}
