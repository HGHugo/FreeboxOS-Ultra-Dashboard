import { Router } from 'express';
import { freeboxApi } from '../services/freeboxApi.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// ===== EPG Cache =====
// Cache EPG results server-side to avoid rate limiting
interface EpgCacheEntry {
  data: unknown;
  fetchedAt: number;
}
const epgCache = new Map<number, EpgCacheEntry>();
const EPG_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours cache TTL
const EPG_INTERVAL = 2 * 60 * 60; // 2 hours interval for timestamp normalization

// Normalize timestamp to fixed 2-hour intervals (00:00, 02:00, 04:00, etc.)
function normalizeEpgTimestamp(timestamp: number): number {
  return Math.floor(timestamp / EPG_INTERVAL) * EPG_INTERVAL;
}

// Clean old cache entries periodically
function cleanEpgCache() {
  const now = Date.now();
  for (const [key, entry] of epgCache.entries()) {
    if (now - entry.fetchedAt > EPG_CACHE_TTL) {
      epgCache.delete(key);
    }
  }
}

// ===== TV Channels =====

// GET /api/tv/channels - Get all channels
router.get('/channels', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getTvChannels();
  res.json(result);
}));

// GET /api/tv/bouquets - Get channel bouquets
router.get('/bouquets', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getTvBouquets();
  res.json(result);
}));

// ===== EPG (Electronic Program Guide) =====

// GET /api/tv/epg/by_time/:timestamp - Get EPG for all channels at a given time
router.get('/epg/by_time/:timestamp', asyncHandler(async (req, res) => {
  const rawTimestamp = parseInt(req.params.timestamp) || Math.floor(Date.now() / 1000);

  // Normalize timestamp to fixed 2-hour intervals
  const timestamp = normalizeEpgTimestamp(rawTimestamp);

  // Check cache first
  const cached = epgCache.get(timestamp);
  if (cached && (Date.now() - cached.fetchedAt) < EPG_CACHE_TTL) {
    return res.json(cached.data);
  }

  // Fetch from Freebox API
  const result = await freeboxApi.getEpgByTime(timestamp);

  // Cache successful results
  if (result && result.success) {
    epgCache.set(timestamp, {
      data: result,
      fetchedAt: Date.now()
    });

    // Clean old entries occasionally
    if (epgCache.size > 20) {
      cleanEpgCache();
    }
  }

  res.json(result);
}));

// ===== PVR (Recordings) =====

// GET /api/tv/recordings - Get finished recordings
router.get('/recordings', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getPvrFinished();
  res.json(result);
}));

// GET /api/tv/programmed - Get programmed recordings
router.get('/programmed', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getPvrProgrammed();
  res.json(result);
}));

// POST /api/tv/programmed - Create new recording
router.post('/programmed', asyncHandler(async (req, res) => {
  const result = await freeboxApi.createPvrProgrammed(req.body);
  res.json(result);
}));

// DELETE /api/tv/programmed/:id - Delete programmed recording
router.delete('/programmed/:id', asyncHandler(async (req, res) => {
  const result = await freeboxApi.deletePvrProgrammed(parseInt(req.params.id));
  res.json(result);
}));

// DELETE /api/tv/recordings/:id - Delete finished recording
router.delete('/recordings/:id', asyncHandler(async (req, res) => {
  const result = await freeboxApi.deletePvrFinished(parseInt(req.params.id));
  res.json(result);
}));

// GET /api/tv/pvr/config - Get PVR config
router.get('/pvr/config', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getPvrConfig();
  res.json(result);
}));

// PUT /api/tv/pvr/config - Update PVR config
router.put('/pvr/config', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updatePvrConfig(req.body);
  res.json(result);
}));

export default router;