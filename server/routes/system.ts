import { Router } from 'express';
import { freeboxApi } from '../services/freeboxApi.js';
import { rebootScheduler } from '../services/scheduler.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { normalizeSystemInfo } from '../services/apiNormalizer.js';

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
    system.box_model_name = version.box_model_name || version.box_model || null;
    system.device_name = version.device_name || null;
    system.api_version = version.api_version || null;

    // Use API normalizer for automatic compatibility
    // This handles both API v8+ format (sensors/fans arrays) and legacy format (flat fields)
    // and ensures BOTH formats are available in the response
    const normalized = normalizeSystemInfo(system);

    // Update the result with normalized data
    systemResult.result = normalized;

    console.log('[System] Normalized data - sensors:', normalized.sensors?.length || 0, 'fans:', normalized.fans?.length || 0);
  }

  res.json(systemResult);
}));

// GET /api/system/reboot/schedule - Get reboot schedule
router.get('/reboot/schedule', asyncHandler(async (_req, res) => {
  const schedule = rebootScheduler.getSchedule();
  res.json({ success: true, result: schedule });
}));

// POST /api/system/reboot/schedule - Update reboot schedule
router.post('/reboot/schedule', asyncHandler(async (req, res) => {
  const schedule = rebootScheduler.updateSchedule(req.body);
  res.json({ success: true, result: schedule });
}));

// POST /api/system/reboot - Reboot Freebox
router.post('/reboot', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.reboot();
  res.json(result);
}));

export default router;