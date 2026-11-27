/**
 * Dashboard authentication (SECURITY HARDENING)
 *
 * The upstream project exposed every /api route and the /ws WebSocket with no
 * authentication at all: anyone on the LAN (or any web page the user visited,
 * via CORS / simple GET requests) could drive the Freebox with full admin rights.
 *
 * This module adds:
 *  - a dashboard password (DASHBOARD_PASSWORD env var, or a random one generated
 *    on first start and stored next to the Freebox token file, mode 0600)
 *  - HttpOnly + SameSite=Strict session cookies (random 256-bit ids)
 *  - brute-force throttling on the login endpoint
 *  - an Origin check on state-changing requests and WebSocket upgrades (CSRF / CSWSH)
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { IncomingMessage } from 'http';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { config } from '../config.js';

const COOKIE_NAME = 'fbx_dash_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_FAILURES = 5;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;

// ---------- Password ----------

const passwordFile = path.join(path.dirname(config.freebox.tokenFile), 'dashboard_password');

function loadOrCreatePassword(): string {
  const fromEnv = process.env.DASHBOARD_PASSWORD;
  if (fromEnv && fromEnv.length > 0) {
    if (fromEnv.length < 12) {
      console.warn('[DashboardAuth] DASHBOARD_PASSWORD is shorter than 12 characters — consider a stronger one.');
    }
    return fromEnv;
  }

  try {
    if (fs.existsSync(passwordFile)) {
      const stored = fs.readFileSync(passwordFile, 'utf-8').trim();
      if (stored) {
        console.log(`[DashboardAuth] Using dashboard password stored in ${passwordFile}`);
        return stored;
      }
    }
  } catch {
    // fall through and generate
  }

  const generated = crypto.randomBytes(18).toString('base64url');
  try {
    fs.mkdirSync(path.dirname(passwordFile), { recursive: true });
    fs.writeFileSync(passwordFile, generated + '\n', { encoding: 'utf-8', mode: 0o600 });
  } catch (err) {
    console.error('[DashboardAuth] Could not persist generated password:', err);
  }
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Mot de passe du dashboard généré (premier démarrage) :   ║');
  console.log(`║  ${generated.padEnd(57)}║`);
  console.log(`║  Stocké dans : ${passwordFile.slice(-43).padEnd(43)}║`);
  console.log('║  Définissez DASHBOARD_PASSWORD pour le remplacer.         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  return generated;
}

const passwordSalt = crypto.randomBytes(16);
const passwordHash = crypto.scryptSync(loadOrCreatePassword(), passwordSalt, 32);

function checkPassword(candidate: unknown): boolean {
  if (typeof candidate !== 'string' || candidate.length === 0 || candidate.length > 1024) return false;
  const hash = crypto.scryptSync(candidate, passwordSalt, 32);
  return crypto.timingSafeEqual(hash, passwordHash);
}

// ---------- Sessions ----------

const sessions = new Map<string, number>(); // sessionId -> expiresAt

function createSession(): string {
  const id = crypto.randomBytes(32).toString('base64url');
  sessions.set(id, Date.now() + SESSION_TTL_MS);
  return id;
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(value);
      } catch {
        out[key] = value;
      }
    }
  }
  return out;
}

function getSessionId(req: IncomingMessage): string | null {
  return parseCookies(req.headers.cookie)[COOKIE_NAME] || null;
}

export function isAuthenticated(req: IncomingMessage): boolean {
  const id = getSessionId(req);
  if (!id) return false;
  const expiresAt = sessions.get(id);
  if (!expiresAt) return false;
  if (expiresAt < Date.now()) {
    sessions.delete(id);
    return false;
  }
  return true;
}

// Periodic cleanup of expired sessions / throttling entries
setInterval(() => {
  const now = Date.now();
  for (const [id, exp] of sessions) if (exp < now) sessions.delete(id);
  for (const [ip, entry] of failures) if (entry.resetAt < now) failures.delete(ip);
}, 60 * 60 * 1000).unref();

function isSecureRequest(req: Request): boolean {
  return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

function setSessionCookie(req: Request, res: Response, value: string, maxAgeMs: number) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`
  ];
  if (isSecureRequest(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

// ---------- Origin check (CSRF / cross-site WebSocket hijacking) ----------

/**
 * Returns true when the request either has no Origin header (same-origin
 * navigation, curl, healthcheck) or its Origin host matches the Host header.
 */
export function isSameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!host) return false;
  try {
    return new URL(origin).host === String(host).split(',')[0].trim();
  } catch {
    return false;
  }
}

// ---------- Brute-force throttling ----------

const failures = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: Request): string {
  return req.socket.remoteAddress || 'unknown';
}

function isLockedOut(key: string): boolean {
  const entry = failures.get(key);
  if (!entry) return false;
  if (entry.resetAt < Date.now()) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(key: string) {
  const now = Date.now();
  const entry = failures.get(key);
  if (!entry || entry.resetAt < now) {
    failures.set(key, { count: 1, resetAt: now + FAILURE_WINDOW_MS });
  } else {
    entry.count++;
  }
}

// ---------- Routes ----------

export const dashboardAuthRouter = Router();

dashboardAuthRouter.get('/status', (req, res) => {
  res.json({ success: true, result: { authenticated: isAuthenticated(req) } });
});

dashboardAuthRouter.post('/login', (req, res) => {
  const key = clientKey(req);
  if (isLockedOut(key)) {
    return res.status(429).json({
      success: false,
      error: { code: 'TOO_MANY_ATTEMPTS', message: 'Trop de tentatives. Réessayez dans 15 minutes.' }
    });
  }

  if (!checkPassword(req.body?.password)) {
    recordFailure(key);
    console.warn(`[DashboardAuth] Failed login from ${key}`);
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_PASSWORD', message: 'Mot de passe incorrect' }
    });
  }

  failures.delete(key);
  const oldId = getSessionId(req);
  if (oldId) sessions.delete(oldId);
  setSessionCookie(req, res, createSession(), SESSION_TTL_MS);
  res.json({ success: true, result: { authenticated: true } });
});

dashboardAuthRouter.post('/logout', (req, res) => {
  const id = getSessionId(req);
  if (id) sessions.delete(id);
  setSessionCookie(req, res, '', 0);
  res.json({ success: true, result: { authenticated: false } });
});

// ---------- Middleware ----------

const PUBLIC_PATHS = new Set(['/api/health', '/api/dashboard-auth/status', '/api/dashboard-auth/login']);
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Applied to every /api request. Static frontend files stay public (they hold no data).
 */
export function requireDashboardAuth(req: Request, res: Response, next: NextFunction) {
  if (!SAFE_METHODS.has(req.method) && !isSameOrigin(req)) {
    return res.status(403).json({
      success: false,
      error: { code: 'BAD_ORIGIN', message: 'Cross-origin request refused' }
    });
  }

  const fullPath = req.baseUrl + req.path;
  if (PUBLIC_PATHS.has(fullPath)) return next();

  if (!isAuthenticated(req)) {
    return res.status(401).json({
      success: false,
      error: { code: 'DASHBOARD_AUTH_REQUIRED', message: 'Authentification au dashboard requise' }
    });
  }
  next();
}
