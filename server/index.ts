import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes
import authRoutes from './routes/auth.js';
import systemRoutes from './routes/system.js';
import connectionRoutes from './routes/connection.js';
import wifiRoutes from './routes/wifi.js';
import lanRoutes from './routes/lan.js';
import downloadsRoutes from './routes/downloads.js';
import vmRoutes from './routes/vm.js';
import callsRoutes from './routes/calls.js';
import contactsRoutes from './routes/contacts.js';
import fsRoutes from './routes/fs.js';
import tvRoutes from './routes/tv.js';
import parentalRoutes from './routes/parental.js';
import settingsRoutes from './routes/settings.js';
import notificationsRoutes from './routes/notifications.js';
import speedtestRoutes from './routes/speedtest.js';

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/connection', connectionRoutes);
app.use('/api/wifi', wifiRoutes);
app.use('/api/lan', lanRoutes);
app.use('/api/downloads', downloadsRoutes);
app.use('/api/vm', vmRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/fs', fsRoutes);
app.use('/api/tv', tvRoutes);
app.use('/api/parental', parentalRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/speedtest', speedtestRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Serve static files from dist folder (production build)
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback - serve index.html for all non-API routes
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start server
const port = config.port;
app.listen(port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Freebox Dashboard Backend Server                ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${port}              ║
║  Freebox URL: ${config.freebox.url}                       ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;