import express from 'express';
import dotenv from 'dotenv';
import statusRoute from './routes/status.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// API routes
app.use('/api', statusRoute);

// Serve static files from client build (after build)
app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`Pi Dashboard server running on port ${PORT}`);
});