import { Router } from 'express';
import { freeboxApi } from '../services/freeboxApi.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/downloads - Get all downloads
router.get('/', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getDownloads();
  res.json(result);
}));

// GET /api/downloads/stats - Get download stats
router.get('/stats', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getDownloadStats();
  res.json(result);
}));

// GET /api/downloads/:id - Get specific download
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createError('Invalid download ID', 400, 'INVALID_ID');
  }
  const result = await freeboxApi.getDownload(id);
  res.json(result);
}));

// GET /api/downloads/:id/trackers - Get download trackers
router.get('/:id/trackers', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createError('Invalid download ID', 400, 'INVALID_ID');
  }
  const result = await freeboxApi.getDownloadTrackers(id);
  res.json(result);
}));

// GET /api/downloads/:id/peers - Get download peers
router.get('/:id/peers', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createError('Invalid download ID', 400, 'INVALID_ID');
  }
  const result = await freeboxApi.getDownloadPeers(id);
  res.json(result);
}));

// POST /api/downloads - Add new download
router.post('/', asyncHandler(async (req, res) => {
  const { url, downloadDir } = req.body;
  if (!url) {
    throw createError('URL is required', 400, 'MISSING_URL');
  }
  const result = await freeboxApi.addDownload(url, downloadDir);
  res.json(result);
}));

// PUT /api/downloads/:id - Update download (pause/resume)
router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createError('Invalid download ID', 400, 'INVALID_ID');
  }
  const { status, io_priority } = req.body;
  const result = await freeboxApi.updateDownload(id, { status, io_priority });
  res.json(result);
}));

// DELETE /api/downloads/:id - Delete download
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createError('Invalid download ID', 400, 'INVALID_ID');
  }
  const deleteFiles = req.query.delete_files === 'true';
  const result = await freeboxApi.deleteDownload(id, deleteFiles);
  res.json(result);
}));

export default router;