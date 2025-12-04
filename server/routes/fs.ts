import { Router } from 'express';
import { freeboxApi } from '../services/freeboxApi.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/fs/list - List files in directory
router.get('/list', asyncHandler(async (req, res) => {
  const path = req.query.path as string || '/';
  const result = await freeboxApi.listFiles(path);
  res.json(result);
}));

// GET /api/fs/info - Get file info
router.get('/info', asyncHandler(async (req, res) => {
  const path = req.query.path as string;
  if (!path) {
    return res.status(400).json({ success: false, error: { message: 'Path required' } });
  }
  const result = await freeboxApi.getFileInfo(path);
  res.json(result);
}));

// POST /api/fs/mkdir - Create directory
router.post('/mkdir', asyncHandler(async (req, res) => {
  const { parent, dirname } = req.body;
  const result = await freeboxApi.createDirectory(parent, dirname);
  res.json(result);
}));

// POST /api/fs/rename - Rename file/folder
router.post('/rename', asyncHandler(async (req, res) => {
  const { src, dst } = req.body;
  const result = await freeboxApi.renameFile(src, dst);
  res.json(result);
}));

// POST /api/fs/remove - Delete files
router.post('/remove', asyncHandler(async (req, res) => {
  const { files } = req.body;
  const result = await freeboxApi.removeFiles(files);
  res.json(result);
}));

// POST /api/fs/copy - Copy files
router.post('/copy', asyncHandler(async (req, res) => {
  const { files, dst, mode } = req.body;
  const result = await freeboxApi.copyFiles(files, dst, mode);
  res.json(result);
}));

// POST /api/fs/move - Move files
router.post('/move', asyncHandler(async (req, res) => {
  const { files, dst, mode } = req.body;
  const result = await freeboxApi.moveFiles(files, dst, mode);
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

export default router;