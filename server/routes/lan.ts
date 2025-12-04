import { Router } from 'express';
import { freeboxApi } from '../services/freeboxApi.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/lan/config - Get LAN config
router.get('/config', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getLanConfig();
  res.json(result);
}));

// GET /api/lan/interfaces - Get all LAN interfaces
router.get('/interfaces', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getLanBrowserInterfaces();
  res.json(result);
}));

// GET /api/lan/devices - Get all devices on all interfaces
router.get('/devices', asyncHandler(async (_req, res) => {
  // First get interfaces
  const interfaces = await freeboxApi.getLanBrowserInterfaces();

  if (!interfaces.success || !Array.isArray(interfaces.result)) {
    res.json(interfaces);
    return;
  }

  // Then get hosts for each interface
  const allDevices: unknown[] = [];
  for (const iface of interfaces.result) {
    const hosts = await freeboxApi.getLanHosts(iface.name);
    if (hosts.success && Array.isArray(hosts.result)) {
      for (const host of hosts.result) {
        allDevices.push({
          ...host,
          interface: iface.name
        });
      }
    }
  }

  res.json({
    success: true,
    result: allDevices
  });
}));

// GET /api/lan/devices/:interface - Get devices on specific interface
router.get('/devices/:interface', asyncHandler(async (req, res) => {
  const interfaceName = req.params.interface;
  const result = await freeboxApi.getLanHosts(interfaceName);
  res.json(result);
}));

// POST /api/lan/wol - Wake on LAN
router.post('/wol', asyncHandler(async (req, res) => {
  const { interface: interfaceName, mac, password } = req.body;

  if (!interfaceName || !mac) {
    throw createError('interface and mac are required', 400, 'MISSING_PARAMS');
  }

  const result = await freeboxApi.wakeOnLan(interfaceName, mac, password);
  res.json(result);
}));

export default router;