import { Router } from 'express';
import { freeboxApi } from '../services/freeboxApi.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

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