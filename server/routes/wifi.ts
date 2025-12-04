import { Router } from 'express';
import { freeboxApi } from '../services/freeboxApi.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/wifi/config - Get global WiFi config
router.get('/config', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getWifiConfig();
  res.json(result);
}));

// PUT /api/wifi/config - Enable/disable WiFi
router.put('/config', asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  const result = await freeboxApi.setWifiConfig(enabled);
  res.json(result);
}));

// GET /api/wifi/aps - Get all access points
router.get('/aps', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getWifiAps();
  res.json(result);
}));

// GET /api/wifi/aps/:id/stations - Get stations for specific AP
router.get('/aps/:id/stations', asyncHandler(async (req, res) => {
  const apId = parseInt(req.params.id, 10);
  const result = await freeboxApi.getWifiApStations(apId);
  res.json(result);
}));

// GET /api/wifi/bss - Get all BSS (SSIDs)
router.get('/bss', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getWifiBss();
  res.json(result);
}));

// WiFi device type for band counting
interface WifiLanDevice {
  active?: boolean;
  reachable?: boolean;
  access_point?: {
    connectivity_type?: string;
    wifi_information?: {
      band?: string;
    };
  };
}

// GET /api/wifi/full - Get complete WiFi status (APs + BSS combined)
router.get('/full', asyncHandler(async (_req, res) => {
  // Fetch all WiFi data in parallel, plus LAN devices for WiFi count
  const [config, aps, bss, lanDevices] = await Promise.allSettled([
    freeboxApi.getWifiConfig(),
    freeboxApi.getWifiAps(),
    freeboxApi.getWifiBss(),
    freeboxApi.getLanHosts('pub')  // Main LAN interface
  ]);

  // Extract results, with safe fallbacks
  const configData = config.status === 'fulfilled' && config.value.success ? config.value.result : null;
  const apsData = aps.status === 'fulfilled' && aps.value.success ? aps.value.result : [];
  const bssData = bss.status === 'fulfilled' && bss.value.success ? bss.value.result : [];

  // Count WiFi devices from LAN data, grouped by band
  let wifiDeviceCount = 0;
  const devicesByBand: Record<string, number> = { '2g4': 0, '5g': 0, '6g': 0 };

  if (lanDevices.status === 'fulfilled' && lanDevices.value.success && Array.isArray(lanDevices.value.result)) {
    const wifiDevices = lanDevices.value.result.filter(
      (device: WifiLanDevice) =>
        device.active && device.reachable && device.access_point?.connectivity_type === 'wifi'
    );
    wifiDeviceCount = wifiDevices.length;

    // Count by band
    for (const device of wifiDevices) {
      const band = (device as WifiLanDevice).access_point?.wifi_information?.band?.toLowerCase() || '';
      if (band.includes('6g')) {
        devicesByBand['6g']++;
      } else if (band.includes('5g')) {
        devicesByBand['5g']++;
      } else if (band.includes('2') || band.includes('2g4') || band.includes('2.4')) {
        devicesByBand['2g4']++;
      }
    }
  }

  res.json({
    success: true,
    result: {
      config: configData,
      aps: apsData,
      bss: bssData,
      wifiDeviceCount,
      devicesByBand
    }
  });
}));

// GET /api/wifi/stations - Get all WiFi stations (connected devices)
router.get('/stations', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getWifiStations();
  res.json(result);
}));

// GET /api/wifi/mac-filter - Get MAC filtering rules
router.get('/mac-filter', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getWifiMacFilter();
  res.json(result);
}));

// GET /api/wifi/planning - Get WiFi scheduling/planning
router.get('/planning', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getWifiPlanning();
  res.json(result);
}));

// PUT /api/wifi/planning - Update WiFi scheduling/planning
router.put('/planning', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateWifiPlanning(req.body);
  res.json(result);
}));

// POST /api/wifi/wps/start - Start WPS session
router.post('/wps/start', asyncHandler(async (_req, res) => {
  // Check if we have settings permission (required for WPS)
  const permissions = freeboxApi.getPermissions();
  console.log('[WiFi WPS] Current permissions:', permissions);

  if (!permissions.settings) {
    console.log('[WiFi WPS] Missing settings permission');
    res.json({
      success: false,
      error: {
        code: 'insufficient_rights',
        message: 'Permission "Modification des réglages de la Freebox" requise. Supprimez freebox_token.json et réenregistrez l\'application en accordant tous les droits sur l\'écran LCD de la Freebox.'
      }
    });
    return;
  }

  const result = await freeboxApi.startWps();
  console.log('[WiFi WPS] Start result:', result);

  // Add helpful error message if WPS fails
  if (!result.success) {
    const errorMsg = result.msg || result.error_code || '';
    let errorResponse: { code: string; message: string };

    if (errorMsg.includes('insuff') || result.error_code === 'insufficient_rights') {
      errorResponse = {
        code: 'insufficient_rights',
        message: 'Permission insuffisante. Supprimez le fichier freebox_token.json et réenregistrez l\'application avec tous les droits.'
      };
    } else if (errorMsg.includes('disabled') || result.error_code === 'wps_disabled') {
      errorResponse = {
        code: 'wps_disabled',
        message: 'WPS est désactivé sur la Freebox. Activez-le dans les paramètres WiFi de Freebox OS.'
      };
    } else {
      errorResponse = {
        code: result.error_code || 'wps_error',
        message: result.msg || 'Erreur lors du démarrage WPS'
      };
    }

    res.json({
      success: false,
      error: errorResponse
    });
    return;
  }

  res.json(result);
}));

// POST /api/wifi/wps/stop - Stop WPS session
router.post('/wps/stop', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.stopWps();
  res.json(result);
}));

// GET /api/wifi/wps/status - Get WPS status
router.get('/wps/status', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getWpsStatus();
  res.json(result);
}));

export default router;