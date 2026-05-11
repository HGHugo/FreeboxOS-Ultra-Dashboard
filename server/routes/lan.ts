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
  const allHosts: Record<string, unknown>[] = [];
  for (const iface of interfaces.result) {
    const hosts = await freeboxApi.getLanHosts(iface.name);
    if (hosts.success && Array.isArray(hosts.result)) {
      for (const host of hosts.result) {
        allHosts.push({
          ...host,
          interface: iface.name
        });
      }
    }
  }

  // Deduplicate by MAC address (l2ident.id).
  // The Freebox API returns the same device on multiple interfaces
  // (e.g. "pub" bridge + "wifiguest"/"wifi0"). We keep the best entry:
  //   1. Active+reachable wins over inactive
  //   2. WiFi connectivity_type wins over ethernet (more specific info)
  //   3. Most recent last_activity wins as tiebreaker
  const byMac = new Map<string, Record<string, unknown>>();

  for (const host of allHosts) {
    const l2 = host.l2ident as { id?: string } | undefined;
    const mac = l2?.id;
    if (!mac) {
      // No MAC — keep as-is (shouldn't happen but be safe)
      byMac.set(`no-mac-${byMac.size}`, host);
      continue;
    }

    const existing = byMac.get(mac);
    if (!existing) {
      byMac.set(mac, host);
      continue;
    }

    // Compare: pick the better entry
    const existingActive = !!(existing.active && existing.reachable);
    const newActive = !!(host.active && host.reachable);

    // Active always wins over inactive
    if (newActive && !existingActive) {
      byMac.set(mac, host);
      continue;
    }
    if (!newActive && existingActive) {
      continue;
    }

    // Both same active state: prefer WiFi connectivity_type (more precise)
    const existingAp = existing.access_point as { connectivity_type?: string } | undefined;
    const newAp = host.access_point as { connectivity_type?: string } | undefined;
    const existingIsWifi = existingAp?.connectivity_type === 'wifi';
    const newIsWifi = newAp?.connectivity_type === 'wifi';

    if (newIsWifi && !existingIsWifi) {
      byMac.set(mac, host);
      continue;
    }
    if (!newIsWifi && existingIsWifi) {
      continue;
    }

    // Same connectivity: keep the one with most recent activity
    const existingActivity = (existing.last_activity as number) || 0;
    const newActivity = (host.last_activity as number) || 0;
    if (newActivity > existingActivity) {
      byMac.set(mac, host);
    }
  }

  res.json({
    success: true,
    result: Array.from(byMac.values())
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