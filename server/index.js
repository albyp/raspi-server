import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import statusRoute from './routes/status.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(express.json());

// API routes
app.use('/api', statusRoute);

// Serve the built client (copied into server/public by the Docker build)
app.use(express.static(PUBLIC_DIR));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'), err => err && next());
});

app.listen(PORT, () => {
  console.log(`Pi Dashboard server running on port ${PORT}`);
});
