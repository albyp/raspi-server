import crypto from 'crypto';
import express from 'express';

// Single-user password login. The hash and the cookie-signing secret come from .env;
// set both with ./set-password.sh on the host. Without them nobody can log in.
//   DASHBOARD_PASSWORD_HASH = scrypt:<salt hex>:<key hex>   (no '$' — compose would interpolate it)
//   SESSION_SECRET          = random hex
const COOKIE = 'dash_session';
const SESSION_DAYS = 30;
const MAX_FAILURES = 10;
const LOCKOUT_MS = 15 * 60 * 1000;

const failures = { count: 0, since: 0 };

function configured() {
  return Boolean(process.env.DASHBOARD_PASSWORD_HASH && process.env.SESSION_SECRET);
}

function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt);
  return `scrypt:${salt.toString('hex')}:${key.toString('hex')}`;
}

async function checkPassword(password) {
  const [scheme, saltHex, keyHex] = (process.env.DASHBOARD_PASSWORD_HASH || '').split(':');
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scrypt(String(password), Buffer.from(saltHex, 'hex'));
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function sign(value) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(value).digest('hex');
}

function makeToken() {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return `${expires}.${sign(String(expires))}`;
}

function validToken(token) {
  const [expires, mac] = (token || '').split('.');
  if (!expires || !mac || Number(expires) < Date.now()) return false;
  const expected = Buffer.from(sign(expires), 'hex');
  const given = Buffer.from(mac, 'hex');
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function setSessionCookie(res, value, maxAgeSeconds) {
  // Secure: the dashboard is only served over HTTPS by `tailscale serve`
  res.set('Set-Cookie', `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`);
}

// Where to go after logging in: same-site paths only ('/x', never '//host' or '/\host')
function safeNext(value) {
  return typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : '/';
}

function loginPage(message = '', next = '/') {
  const action = next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboard login</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; background: #111418; color: #e6e6e6; }
  @media (prefers-color-scheme: light) { body { background: #f4f5f7; color: #1b1d21; } form { background: #fff !important; } }
  form { background: #1b1f25; padding: 2rem; border-radius: 12px; width: min(320px, calc(100vw - 32px)); box-sizing: border-box; display: grid; gap: .75rem; }
  h1 { margin: 0 0 .5rem; font-size: 1.2rem; }
  input, button { font: inherit; padding: .6rem .75rem; border-radius: 8px; border: 1px solid #5557; }
  button { background: #00a884; color: #fff; border: 0; cursor: pointer; }
  .msg { color: #e5534b; font-size: .9rem; min-height: 1.2em; }
</style></head>
<body><form method="post" action="${action.replace(/"/g, '&quot;')}">
  <h1>Dashboard</h1>
  <input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required>
  <button type="submit">Log in</button>
  <div class="msg">${message}</div>
</form></body></html>`;
}

export function authRouter() {
  const router = express.Router();
  router.use(express.urlencoded({ extended: false, limit: '2kb' }));

  router.get('/login', (req, res) => {
    const next = safeNext(req.query.next);
    if (validToken(readCookie(req, COOKIE))) return res.redirect(302, next);
    res.type('html').send(loginPage(configured() ? '' : 'Login is not set up. Run ./set-password.sh on the host.', next));
  });

  router.post('/login', async (req, res) => {
    const next = safeNext(req.query.next);
    if (!configured()) return res.status(503).type('html').send(loginPage('Login is not set up. Run ./set-password.sh on the host.', next));

    // Global lockout: behind `tailscale serve` every request comes from 127.0.0.1
    if (failures.count >= MAX_FAILURES && Date.now() - failures.since < LOCKOUT_MS) {
      return res.status(429).type('html').send(loginPage('Too many attempts. Try again in 15 minutes.', next));
    }

    if (await checkPassword(req.body?.password ?? '')) {
      failures.count = 0;
      setSessionCookie(res, makeToken(), SESSION_DAYS * 24 * 60 * 60);
      return res.redirect(303, next);
    }

    if (Date.now() - failures.since >= LOCKOUT_MS) {
      failures.since = Date.now();
      failures.count = 0;
    }
    failures.count += 1;
    console.warn(`Failed dashboard login (${failures.count}/${MAX_FAILURES})`);
    res.status(401).type('html').send(loginPage('Wrong password.', next));
  });

  router.post('/logout', (req, res) => {
    setSessionCookie(res, '', 0);
    res.redirect(303, '/login');
  });

  return router;
}

// Everything except the login page and the container healthcheck needs a session
export function requireLogin(req, res, next) {
  if (req.path === '/api/health') return next();
  if (configured() && validToken(readCookie(req, COOKIE))) return next();
  if (req.path.startsWith('/api/') || req.path.startsWith('/betbot/api/')) {
    return res.status(401).json({ error: 'login required' });
  }
  res.redirect(302, req.originalUrl === '/' ? '/login' : `/login?next=${encodeURIComponent(req.originalUrl)}`);
}
