import { Router } from 'express';
import { freeboxApi } from '../services/freeboxApi.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/system/version - Get API version info (includes box model name)
// This endpoint is public and doesn't require auth
router.get('/version', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getApiVersion();
  res.json(result);
}));

// GET /api/system - Get system info with combined API version data
router.get('/', asyncHandler(async (_req, res) => {
  // Get both system info and API version in parallel
  const [systemResult, versionResult] = await Promise.all([
    freeboxApi.getSystemInfo(),
    freeboxApi.getApiVersion()
  ]);

  // If we have version info, add the box model name to system info
  if (systemResult.success && systemResult.result && versionResult.success && versionResult.result) {
    const version = versionResult.result as Record<string, unknown>;
    const system = systemResult.result as Record<string, unknown>;

    // Add model info from api_version endpoint
    // api_version returns: box_model_name (e.g. "Freebox v9 (r1)")
    system.box_model_name = version.box_model_name || version.box_model || null;
    system.device_name = version.device_name || null;
    system.api_version = version.api_version || null;
  }

  res.json(systemResult);
}));

// POST /api/system/reboot - Reboot Freebox
router.post('/reboot', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.reboot();
  res.json(result);
}));

export default router;