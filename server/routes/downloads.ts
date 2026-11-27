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

// GET /api/downloads/:id/files - Get download files
router.get('/:id/files', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createError('Invalid download ID', 400, 'INVALID_ID');
  }
  const result = await freeboxApi.getDownloadFiles(id);
  res.json(result);
}));

// PUT /api/downloads/:id/files/:fileId - Update download file priority
router.put('/:id/files/:fileId', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const fileId = req.params.fileId;
  if (isNaN(id)) {
    throw createError('Invalid download ID', 400, 'INVALID_ID');
  }
  const { priority } = req.body;
  const result = await freeboxApi.updateDownloadFile(id, fileId, priority);
  res.json(result);
}));

// GET /api/downloads/:id/pieces - Get download pieces
router.get('/:id/pieces', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createError('Invalid download ID', 400, 'INVALID_ID');
  }
  const result = await freeboxApi.getDownloadPieces(id);
  res.json(result);
}));

// GET /api/downloads/:id/blacklist - Get download blacklist
router.get('/:id/blacklist', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createError('Invalid download ID', 400, 'INVALID_ID');
  }
  const result = await freeboxApi.getDownloadBlacklist(id);
  res.json(result);
}));

// DELETE /api/downloads/:id/blacklist/empty - Empty download blacklist
router.delete('/:id/blacklist/empty', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createError('Invalid download ID', 400, 'INVALID_ID');
  }
  const result = await freeboxApi.emptyDownloadBlacklist(id);
  res.json(result);
}));

// GET /api/downloads/:id/log - Get download log
router.get('/:id/log', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createError('Invalid download ID', 400, 'INVALID_ID');
  }
  const result = await freeboxApi.getDownloadLog(id);
  res.json(result);
}));

// POST /api/downloads - Add new download (URL or file)
router.post('/', asyncHandler(async (req, res) => {
  const { url, downloadDir, fileBase64, filename } = req.body;

  // If fileBase64 is provided, use file upload method
  // SECURITY: validate before building the multipart body (CRLF / header injection)
  if (downloadDir !== undefined && downloadDir !== null && downloadDir !== '' &&
      (typeof downloadDir !== 'string' || !/^[A-Za-z0-9+/=]{1,4096}$/.test(downloadDir))) {
    throw createError('Invalid download directory', 400, 'INVALID_DIR');
  }

  if (fileBase64 && filename) {
    if (typeof filename !== 'string' || filename.length > 255 || /[\r\n"\\\u0000-\u001f]/.test(filename)) {
      throw createError('Invalid filename', 400, 'INVALID_FILENAME');
    }
    if (typeof fileBase64 !== 'string') {
      throw createError('Invalid file', 400, 'INVALID_FILE');
    }
    // Convert base64 to Buffer
    const fileBuffer = Buffer.from(fileBase64, 'base64');
    // A .torrent is a bencoded dictionary: starts with "d", and is small
    if (fileBuffer.length === 0 || fileBuffer.length > 5 * 1024 * 1024 || fileBuffer[0] !== 0x64) {
      throw createError('Not a valid .torrent file', 400, 'INVALID_TORRENT');
    }
    const result = await freeboxApi.addDownloadFromFile(fileBuffer, filename, downloadDir);
    res.json(result);
    return;
  }

  // Otherwise use URL method
  if (!url) {
    throw createError('URL or file is required', 400, 'MISSING_URL_OR_FILE');
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