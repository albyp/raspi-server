import fetch from 'node-fetch';

// betbot-dashboard publishes on the Pi's loopback only; we run with host networking
export const BETBOT_URL = () => process.env.BETBOT_URL || 'http://127.0.0.1:8171';

export async function betbotFetch(path, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${BETBOT_URL()}${path}`, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Summary for the panel. Read-only: betbot's dashboard has no write endpoints,
// and arming/disarming stays a CLI command on the Pi.
export async function getBetbotInfo() {
  try {
    const res = await betbotFetch('/api/state');
    if (!res.ok) return { reachable: true, error: `betbot state returned ${res.status}` };
    const state = await res.json();
    const live = state.live || {};
    const engine = state.engine || {};
    const next = (state.next_up || [])[0];
    return {
      reachable: true,
      updatedAt: state.updated_at,
      live: live.live,
      reason: live.reason,
      kittyCents: state.session?.caps?.kitty_cents ?? null,
      remainingCents: state.session?.remaining_cents ?? null,
      todayPnlCents: live.today_pnl_cents ?? 0,
      sinceArmPnlCents: live.since_arm_pnl_cents ?? null,
      todayBets: live.today_bets ?? 0,
      openOrders: live.open_orders ?? 0,
      openLiabilityCents: live.open_liability_cents ?? 0,
      // A stopped recorder's missing status file is already shown as "stopped"
      lastError: live.last_error || (engine.process === 'running' ? engine.last_error : null) || null,
      recorder: {
        status: engine.status,
        process: engine.process,
        freshness: engine.freshness,
        ageSeconds: engine.age_seconds,
        login: engine.login,
        marketsToday: engine.markets_tracked_today ?? null
      },
      nextUp: next ? { venue: next.venue, race: next.race, startTime: next.start_time } : null
    };
  } catch (error) {
    return {
      reachable: false,
      error: error.name === 'AbortError' ? 'timeout'
        : error.code === 'ECONNREFUSED' ? 'betbot-dashboard is not running' : error.message
    };
  }
}
