import fetch from 'node-fetch';

// GET a URL without following redirects; never throws.
// ok: true (2xx/3xx), false (4xx/5xx), null (unreachable)
export async function probeHttp(url, { timeout = 3000, headers = {}, json = false } = {}) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { redirect: 'manual', signal: controller.signal, headers });
    const contentType = res.headers.get('content-type') || '';
    let body = null;
    if (json && contentType.includes('json')) {
      body = await res.json().catch(() => null);
    } else {
      res.body?.resume?.();
    }
    return {
      ok: res.status < 400,
      status: res.status,
      isHtml: contentType.includes('text/html'),
      latency: Date.now() - started,
      body
    };
  } catch (error) {
    return { ok: null, status: null, error: error.name === 'AbortError' ? 'timeout' : error.code || error.message };
  } finally {
    clearTimeout(timer);
  }
}
