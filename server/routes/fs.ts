import { Router } from 'express';
import { freeboxApi } from '../services/freeboxApi.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/fs/list - List files in directory
router.get('/list', asyncHandler(async (req, res) => {
  // If no path provided, list root directory
  // If path provided, it's already base64 encoded from Freebox API
  const path = req.query.path ? decodeURIComponent(req.query.path as string) : '/';
  const result = await freeboxApi.listFiles(path);

  // API v15+ returns an object with pagination instead of an array
  // Normalize the response to always return an array for backward compatibility
  if (result.success && result.result) {
    const data = result.result as { entries?: unknown[]; [key: string]: unknown } | unknown[];
    // If it's an object with 'entries' property (v15+ format), extract the array
    if (data && typeof data === 'object' && !Array.isArray(data) && 'entries' in data) {
      result.result = data.entries;
    }
  }

  res.json(result);
}));

// GET /api/fs/info - Get file info
router.get('/info', asyncHandler(async (req, res) => {
  const encodedPath = req.query.path as string;
  if (!encodedPath) {
    return res.status(400).json({ success: false, error: { message: 'Path required' } });
  }
  const path = decodeURIComponent(encodedPath);
  const result = await freeboxApi.getFileInfo(path);
  res.json(result);
}));

// POST /api/fs/mkdir - Create directory
router.post('/mkdir', asyncHandler(async (req, res) => {
  const { parent, dirname } = req.body;
  // parent may be URL-encoded, decode it
  const decodedParent = parent ? decodeURIComponent(parent) : parent;
  const result = await freeboxApi.createDirectory(decodedParent, dirname);
  res.json(result);
}));

// POST /api/fs/rename - Rename file/folder
router.post('/rename', asyncHandler(async (req, res) => {
  const { src, dst } = req.body;
  // Decode URL-encoded paths
  const decodedSrc = src ? decodeURIComponent(src) : src;
  const decodedDst = dst ? decodeURIComponent(dst) : dst;
  const result = await freeboxApi.renameFile(decodedSrc, decodedDst);
  res.json(result);
}));

// POST /api/fs/remove - Delete files
router.post('/remove', asyncHandler(async (req, res) => {
  const { files } = req.body;
  // Decode URL-encoded file paths
  const decodedFiles = files ? files.map((f: string) => decodeURIComponent(f)) : files;
  const result = await freeboxApi.removeFiles(decodedFiles);
  res.json(result);
}));

// POST /api/fs/copy - Copy files
router.post('/copy', asyncHandler(async (req, res) => {
  const { files, dst, mode } = req.body;
  // Decode URL-encoded paths
  const decodedFiles = files ? files.map((f: string) => decodeURIComponent(f)) : files;
  const decodedDst = dst ? decodeURIComponent(dst) : dst;
  const result = await freeboxApi.copyFiles(decodedFiles, decodedDst, mode);
  res.json(result);
}));

// POST /api/fs/move - Move files
router.post('/move', asyncHandler(async (req, res) => {
  const { files, dst, mode } = req.body;
  // Decode URL-encoded paths
  const decodedFiles = files ? files.map((f: string) => decodeURIComponent(f)) : files;
  const decodedDst = dst ? decodeURIComponent(dst) : dst;
  const result = await freeboxApi.moveFiles(decodedFiles, decodedDst, mode);
  res.json(result);
}));

// GET /api/fs/storage - Get storage info
router.get('/storage', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getStorageInfo();
  res.json(result);
}));

// GET /api/fs/disks - Get disk list
router.get('/disks', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getDisks();
  res.json(result);
}));

// ==================== FILE SHARING ====================

// GET /api/fs/share - Get all share links
router.get('/share', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getShareLinks();
  res.json(result);
}));

// GET /api/fs/share/:token - Get share link by token
router.get('/share/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;
  const result = await freeboxApi.getShareLink(token);
  res.json(result);
}));

// POST /api/fs/share - Create share link
router.post('/share', asyncHandler(async (req, res) => {
  const { path, expire } = req.body;
  // path should be base64 encoded (as returned by Freebox API)
  const decodedPath = path ? decodeURIComponent(path) : path;
  const result = await freeboxApi.createShareLink(decodedPath, expire);
  res.json(result);
}));

// DELETE /api/fs/share/:token - Delete share link
router.delete('/share/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;
  const result = await freeboxApi.deleteShareLink(token);
  res.json(result);
}));

export default router;