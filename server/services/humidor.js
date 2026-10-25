import fetch from 'node-fetch';

// Govee H5074 (and other H5xxx) BLE sensors in HA look like sensor.h5074_3ea3_humidity.
// Every sensor whose entity_id matches this and has a humidity reading becomes a humidor.
const MATCH = () => new RegExp(process.env.HUMIDOR_MATCH || '^sensor\\.h5\\d{3}_[0-9a-f]+_', 'i');

const num = (name, fallback) => Number(process.env[name] ?? fallback);
// Target ranges — defaults follow the usual cigar storage guidance (~62–72% RH, 16–21°C)
const limits = () => ({
  rh: { min: num('HUMIDOR_RH_MIN', 62), max: num('HUMIDOR_RH_MAX', 72) },
  temp: { min: num('HUMIDOR_TEMP_MIN', 16), max: num('HUMIDOR_TEMP_MAX', 21), beetle: 24 },
  staleMinutes: num('HUMIDOR_STALE_MIN', 30),
  lowBattery: 20
});

const HISTORY_HOURS = 24;
const HISTORY_TTL = 5 * 60 * 1000;
let historyCache = { at: 0, key: '', data: {} };

async function ha(path) {
  const base = process.env.HA_BASE_URL || 'http://localhost:8123';
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${process.env.HA_TOKEN}` }
  });
  if (!res.ok) throw new Error(`HA ${path.split('?')[0]} returned ${res.status}`);
  return res.json();
}

// Humidity history, thinned to ~1 point per 10 minutes so the payload stays small
async function getHistory(entityIds) {
  const key = entityIds.join(',');
  if (key === historyCache.key && Date.now() - historyCache.at < HISTORY_TTL) return historyCache.data;

  const start = new Date(Date.now() - HISTORY_HOURS * 3600 * 1000).toISOString();
  const raw = await ha(
    `/api/history/period/${start}?filter_entity_id=${key}&minimal_response&no_attributes`
  );
  const data = {};
  for (const series of raw) {
    if (!series.length) continue;
    const id = series[0].entity_id;
    const points = [];
    let lastBucket = null;
    for (const p of series) {
      const v = Number(p.state);
      if (!Number.isFinite(v)) continue;
      const t = new Date(p.last_changed || p.last_updated).getTime();
      const bucket = Math.floor(t / 600000);
      if (bucket === lastBucket) points[points.length - 1] = [t, v];
      else points.push([t, v]);
      lastBucket = bucket;
    }
    data[id] = points;
  }
  historyCache = { at: Date.now(), key, data };
  return data;
}

function assess(rh, temp, battery, stale, lim) {
  // Ordered worst-first; the first match is the headline status
  if (stale) return { level: 'stale', label: 'no recent data' };
  if (rh != null && rh < lim.rh.min - 7) return { level: 'critical', label: 'too dry' };
  if (rh != null && rh > lim.rh.max + 3) return { level: 'critical', label: 'too wet — mould risk' };
  if (temp != null && temp >= lim.temp.beetle) return { level: 'critical', label: 'too warm — beetle risk' };
  if (rh != null && rh < lim.rh.min) return { level: 'warning', label: 'drying out' };
  if (rh != null && rh > lim.rh.max) return { level: 'warning', label: 'running wet' };
  if (temp != null && (temp < lim.temp.min || temp > lim.temp.max)) return { level: 'warning', label: 'temp out of range' };
  if (battery != null && battery < lim.lowBattery) return { level: 'warning', label: 'low battery' };
  return { level: 'good', label: 'in range' };
}

export async function getHumidorInfo() {
  if (!process.env.HA_TOKEN) return { reachable: false, error: 'No HA token configured' };

  try {
    const states = await ha('/api/states');
    const re = MATCH();
    const lim = limits();

    // Group sensor.<device>_<measure> by device prefix
    const devices = new Map();
    for (const s of states) {
      const m = s.entity_id.match(/^(sensor\.[a-z0-9_]+?)_(temperature|humidity|battery)$/);
      if (!m || !re.test(s.entity_id)) continue;
      const [, prefix, measure] = m;
      if (!devices.has(prefix)) devices.set(prefix, {});
      devices.get(prefix)[measure] = s;
    }

    const found = [...devices.entries()].filter(([, d]) => d.humidity);
    const history = await getHistory(found.map(([, d]) => d.humidity.entity_id)).catch(err => {
      console.warn('Humidor history unavailable:', err.message);
      return {};
    });

    const humidors = found.map(([prefix, d]) => {
      const val = s => (s && Number.isFinite(Number(s.state)) ? Number(s.state) : null);
      const rh = val(d.humidity);
      const temp = val(d.temperature);
      const battery = val(d.battery);
      const lastUpdated = [d.humidity, d.temperature].filter(Boolean)
        .map(s => s.last_updated).sort().pop();
      const stale = !lastUpdated || Date.now() - new Date(lastUpdated).getTime() > lim.staleMinutes * 60000;
      const name = (d.humidity.attributes.friendly_name || prefix)
        .replace(/\s*humidity$/i, '')
        .replace(/^humidor\s*[-–]\s*/i, '');
      const points = history[d.humidity.entity_id] || [];
      const values = points.map(p => p[1]);

      return {
        id: prefix.replace('sensor.', ''),
        name,
        humidity: rh,
        temperature: temp,
        battery,
        lastUpdated,
        stale,
        status: assess(rh, temp, battery, stale, lim),
        history: points,
        range24h: values.length ? { min: Math.min(...values), max: Math.max(...values) } : null
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    return { reachable: true, limits: lim, humidors };
  } catch (error) {
    console.error('Error getting humidor info:', error.message);
    return { reachable: false, error: error.message };
  }
}
