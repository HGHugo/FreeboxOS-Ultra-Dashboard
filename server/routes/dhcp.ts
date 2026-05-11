import { Router } from 'express';
import { freeboxApi } from '../services/freeboxApi.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/dhcp/config - Get DHCP configuration
router.get('/config', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getDhcpConfig();
  res.json(result);
}));

// PUT /api/dhcp/config - Update DHCP configuration
router.put('/config', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateDhcpConfig(req.body);
  res.json(result);
}));

// GET /api/dhcp/static-leases - Get all static leases
router.get('/static-leases', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getDhcpStaticLeases();
  res.json(result);
}));

// GET /api/dhcp/static-leases/:id - Get a specific static lease
router.get('/static-leases/:id', asyncHandler(async (req, res) => {
  const result = await freeboxApi.getDhcpStaticLease(req.params.id);
  res.json(result);
}));

// POST /api/dhcp/static-leases - Add a new static lease
router.post('/static-leases', asyncHandler(async (req, res) => {
  const { mac, ip, comment } = req.body;
  const result = await freeboxApi.addDhcpStaticLease(mac, ip, comment);
  res.json(result);
}));

// PUT /api/dhcp/static-leases/:id - Update a static lease
router.put('/static-leases/:id', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateDhcpStaticLease(req.params.id, req.body);
  res.json(result);
}));

// DELETE /api/dhcp/static-leases/:id - Delete a static lease
router.delete('/static-leases/:id', asyncHandler(async (req, res) => {
  const result = await freeboxApi.deleteDhcpStaticLease(req.params.id);
  res.json(result);
}));

export default router;
