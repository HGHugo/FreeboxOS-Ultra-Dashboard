import { Router } from 'express';
import { freeboxApi } from '../services/freeboxApi.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/connection - Get connection status
router.get('/', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getConnectionStatus();
  res.json(result);
}));

// GET /api/connection/config - Get connection config
router.get('/config', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getConnectionConfig();
  res.json(result);
}));

// GET /api/connection/ipv6 - Get IPv6 config
router.get('/ipv6', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getIpv6Config();
  res.json(result);
}));

// GET /api/connection/history - Get bandwidth history (RRD)
router.get('/history', asyncHandler(async (req, res) => {
  const { start, end } = req.query;
  const dateStart = start ? parseInt(start as string, 10) : undefined;
  const dateEnd = end ? parseInt(end as string, 10) : undefined;

  // Request all net fields - the API will return rate_down, rate_up, bw_down, bw_up
  const result = await freeboxApi.getRrdData('net', dateStart, dateEnd);

  // Log for debugging
  const rrdResult = result.result as { data?: unknown[] } | undefined;
  if (result.success && rrdResult?.data) {
    console.log('[RRD] Net history - points:', rrdResult.data.length, 'sample:', rrdResult.data[0]);
  } else {
    console.log('[RRD] Net history failed or empty:', result.success, result.msg || result.error_code);
  }

  res.json(result);
}));

// GET /api/connection/temp-history - Get temperature history (RRD)
router.get('/temp-history', asyncHandler(async (req, res) => {
  const { start, end } = req.query;
  const dateStart = start ? parseInt(start as string, 10) : undefined;
  const dateEnd = end ? parseInt(end as string, 10) : undefined;

  const result = await freeboxApi.getRrdData('temp', dateStart, dateEnd);
  res.json(result);
}));

// GET /api/connection/logs - Get connection logs
router.get('/logs', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getConnectionLogs();
  res.json(result);
}));

export default router;