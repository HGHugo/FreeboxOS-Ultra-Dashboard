import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireDashboardAuth, dashboardAuthRouter } from './middleware/dashboardAuth.js';
import { connectionWebSocket } from './services/connectionWebSocket.js';
import { freeboxNativeWebSocket } from './services/freeboxNativeWebSocket.js';

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
import capabilitiesRoutes from './routes/capabilities.js';
import dhcpRoutes from './routes/dhcp.js';

const app = express();

// Trust X-Forwarded-* only when explicitly behind a reverse proxy
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY);
}
app.disable('x-powered-by');

// SECURITY: the frontend is served from the same origin in production, so no
// CORS is needed there. Upstream used `origin: true` (reflect any origin with
// credentials), which let any website read the API. Dev keeps the Vite ports.
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  }));
}

// Freebox origins allowed for images (TV channel logos are served by the box)
const freeboxImgSources = Array.from(new Set([
  'https://mafreebox.freebox.fr',
  new URL(config.freebox.url).origin,
  `https://${config.freebox.localIp}`,
  `http://${config.freebox.localIp}`
])).join(' ');

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https://img.logo.dev https://cdn.jsdelivr.net ${freeboxImgSources}`,
      "connect-src 'self' ws: wss:",
      "media-src 'self' blob:",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'"
    ].join('; ')
  );
  next();
});

app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// SECURITY: every /api route requires a dashboard session (except health + login)
app.use('/api', requireDashboardAuth);
app.use('/api/dashboard-auth', dashboardAuthRouter);

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
app.use('/api/capabilities', capabilitiesRoutes);
app.use('/api/dhcp', dhcpRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from dist folder (production build only)
// IMPORTANT: Must be BEFORE error handler for SPA fallback to work
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  // SPA fallback - serve index.html for all non-API routes
  // Express 5 requires named wildcards, use middleware instead for compatibility
  app.use((req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/ws/')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handler - must be AFTER static files and SPA fallback
app.use(errorHandler);

// Create HTTP server (needed for WebSocket)
const server = http.createServer(app);

// Log upgrade requests for debugging
server.on('upgrade', (request, socket, head) => {
  console.log('[HTTP] Upgrade request received:', request.url);
});

// Initialize WebSocket server (our internal dashboard WS)
connectionWebSocket.init(server);

// Start server
const port = config.port;
// Bind to all interfaces by default (needed inside Docker); set HOST=127.0.0.1
// when running directly on a machine to keep the dashboard local-only.
const host = process.env.HOST || '0.0.0.0';
server.listen(port, host, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Freebox Dashboard Backend Server                ║
╠═══════════════════════════════════════════════════════════╣
║  Local:   http://localhost:${port}                        ║
║  Network: http://IP_DU_SERVEUR:${port}                    ║
║  Freebox: ${config.freebox.url}                           ║
║  WebSocket: ws://localhost:${port}/ws/connection          ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;