import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import statusRoute from './routes/status.js';
import { betbotFetch } from './services/betbot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(express.json());

// API routes
app.use('/api', statusRoute);

// betbot's own page, proxied read-only from its loopback-only port. The page
// fetches 'api/state' relative to itself, so it needs the trailing slash.
// Regex, not '/betbot': non-strict routing would also match '/betbot/' and loop
app.get(/^\/betbot$/, (req, res) => res.redirect(302, '/betbot/'));
app.get(['/betbot/', '/betbot/api/state'], async (req, res) => {
  try {
    const upstream = await betbotFetch(req.path.replace(/^\/betbot/, ''), 10000);
    for (const header of ['content-type', 'cache-control', 'content-security-policy', 'x-content-type-options']) {
      const value = upstream.headers.get(header);
      if (value) res.set(header, value);
    }
    res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    res.status(502).json({ error: `betbot-dashboard unreachable: ${error.message}` });
  }
});

// Serve the built client (copied into server/public by the Docker build)
app.use(express.static(PUBLIC_DIR));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'), err => err && next());
});

app.listen(PORT, () => {
  console.log(`Pi Dashboard server running on port ${PORT}`);
});
