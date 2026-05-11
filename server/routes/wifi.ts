import { Router } from 'express';
import { freeboxApi } from '../services/freeboxApi.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { modelDetection } from '../services/modelDetection.js';

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

// PUT /api/wifi/bss/:id - Enable/disable a specific BSS
router.put('/bss/:id', asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  console.log(`[WiFi] Toggle BSS ${req.params.id} -> enabled: ${enabled}`);
  const result = await freeboxApi.updateWifiBss(req.params.id, { enabled });
  console.log(`[WiFi] Toggle BSS result:`, result.success ? 'OK' : 'FAILED');
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

  // Filter out 6GHz data if model doesn't support it
  const supports6ghz = modelDetection.supportsWifi6ghz();
  let filteredAps = apsData || [];
  let filteredBss = bssData || [];
  const filteredDevicesByBand = { ...devicesByBand };

  // NOTE: Inactive/disabled WiFi bands (e.g., 5GHz power-saving mode on Ultra)
  // are NOT returned by the Freebox API, so we cannot display them.
  // This is an API limitation, not a dashboard issue.

  if (!supports6ghz && Array.isArray(apsData) && Array.isArray(bssData)) {
    // Filter out 6GHz APs (for Pop v8, Revolution v6)
    filteredAps = apsData.filter(
      (ap: { band?: string }) => !ap.band?.toLowerCase().includes('6g')
    );
    // Filter out 6GHz BSS
    filteredBss = bssData.filter(
      (bss: { band?: string }) => !bss.band?.toLowerCase().includes('6g')
    );
    // Remove 6GHz device count
    filteredDevicesByBand['6g'] = 0;
  }

  res.json({
    success: true,
    result: {
      config: configData,
      aps: filteredAps,
      bss: filteredBss,
      wifiDeviceCount: supports6ghz ? wifiDeviceCount : wifiDeviceCount - devicesByBand['6g'],
      devicesByBand: filteredDevicesByBand
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

// ==================== WiFi Temporary Disable (v13.0+) ====================

// GET /api/wifi/temp-disable - Get temporary disable status
router.get('/temp-disable', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getWifiTempDisableStatus();
  res.json(result);
}));

// POST /api/wifi/temp-disable - Temporarily disable WiFi
router.post('/temp-disable', asyncHandler(async (req, res) => {
  const { duration } = req.body; // Duration in seconds
  const result = await freeboxApi.setWifiTempDisable(duration);
  res.json(result);
}));

// DELETE /api/wifi/temp-disable - Cancel temporary disable
router.delete('/temp-disable', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.cancelWifiTempDisable();
  res.json(result);
}));

// ==================== WiFi Guest Network (v14.0+) ====================

// GET /api/wifi/guest/config - Get guest network config
router.get('/guest/config', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getWifiCustomKeyConfig();
  res.json(result);
}));

// PUT /api/wifi/guest/config - Update guest network config
router.put('/guest/config', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateWifiCustomKeyConfig(req.body);
  res.json(result);
}));

// GET /api/wifi/guest/keys - Get guest network keys
router.get('/guest/keys', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getWifiCustomKeys();
  res.json(result);
}));

// POST /api/wifi/guest/keys - Create guest network key
router.post('/guest/keys', asyncHandler(async (req, res) => {
  const result = await freeboxApi.createWifiCustomKey(req.body);
  res.json(result);
}));

// DELETE /api/wifi/guest/keys/:id - Delete guest network key
router.delete('/guest/keys/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = await freeboxApi.deleteWifiCustomKey(id);
  res.json(result);
}));

// ==================== WiFi MLO - Multi Link Operation (v14.0+ WiFi 7) ====================

// GET /api/wifi/mlo/config - Get MLO config
router.get('/mlo/config', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getWifiMloConfig();
  res.json(result);
}));

// PUT /api/wifi/mlo/config - Update MLO config
router.put('/mlo/config', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateWifiMloConfig(req.body);
  res.json(result);
}));

export default router;