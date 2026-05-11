import { Router } from 'express';
import { freeboxApi } from '../services/freeboxApi.js';
import { modelDetection } from '../services/modelDetection.js';
import { connectionWebSocket } from '../services/connectionWebSocket.js';
import { freeboxNativeWebSocket } from '../services/freeboxNativeWebSocket.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';

const router = Router();

// POST /api/auth/register - Start app registration
router.post('/register', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.register();
  res.json({
    success: true,
    result: {
      trackId: result.trackId,
      message: 'Please confirm on your Freebox LCD screen'
    }
  });
}));

// GET /api/auth/status/:trackId - Check registration status
router.get('/status/:trackId', asyncHandler(async (req, res) => {
  const trackId = parseInt(req.params.trackId, 10);
  if (isNaN(trackId)) {
    throw createError('Invalid trackId', 400, 'INVALID_TRACK_ID');
  }

  const status = await freeboxApi.checkRegistrationStatus(trackId);
  res.json({
    success: true,
    result: status
  });
}));

// POST /api/auth/login - Open session
router.post('/login', asyncHandler(async (_req, res) => {
  if (!freeboxApi.isRegistered()) {
    throw createError('App not registered. Please register first.', 401, 'NOT_REGISTERED');
  }

  const session = await freeboxApi.login();

  // Detect model capabilities after successful login
  const capabilities = await modelDetection.detectModel();

  // Notify WebSocket services
  connectionWebSocket.onLogin();
  freeboxNativeWebSocket.onLogin(); // Start native Freebox WebSocket (API v8+)

  res.json({
    success: true,
    result: {
      permissions: session.permissions,
      capabilities,
      message: 'Login successful'
    }
  });
}));

// POST /api/auth/logout - Close session
router.post('/logout', asyncHandler(async (_req, res) => {
  await freeboxApi.logout();
  // Clear cached capabilities on logout
  modelDetection.clearCache();
  // Notify WebSocket services
  connectionWebSocket.onLogout();
  freeboxNativeWebSocket.onLogout();
  res.json({
    success: true,
    result: { message: 'Logged out' }
  });
}));

// GET /api/auth/check - Check session status
router.get('/check', asyncHandler(async (_req, res) => {
  const isLoggedIn = await freeboxApi.checkSession();

  // Include capabilities if logged in
  let capabilities = null;
  if (isLoggedIn) {
    capabilities = await modelDetection.detectModel();
  }

  res.json({
    success: true,
    result: {
      isRegistered: freeboxApi.isRegistered(),
      isLoggedIn,
      permissions: freeboxApi.getPermissions(),
      capabilities
    }
  });
}));

// POST /api/auth/set-url - Set Freebox base URL
router.post('/set-url', asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url) {
    throw createError('URL is required', 400, 'MISSING_URL');
  }

  freeboxApi.setBaseUrl(url);
  res.json({
    success: true,
    result: {
      url: freeboxApi.getBaseUrl(),
      message: 'URL updated'
    }
  });
}));

// GET /api/auth/url - Get current Freebox base URL
router.get('/url', asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    result: {
      url: freeboxApi.getBaseUrl()
    }
  });
}));

// POST /api/auth/reset - Reset token (for re-registration when token is invalid)
router.post('/reset', asyncHandler(async (_req, res) => {
  // Logout first if logged in
  if (freeboxApi.isLoggedIn()) {
    await freeboxApi.logout();
  }

  // Reset the token
  freeboxApi.resetToken();

  // Clear cached capabilities
  modelDetection.clearCache();

  // Notify WebSocket services
  connectionWebSocket.onLogout();
  freeboxNativeWebSocket.onLogout();

  res.json({
    success: true,
    result: {
      message: 'Token reset successful. Please re-register the application.'
    }
  });
}));

export default router;