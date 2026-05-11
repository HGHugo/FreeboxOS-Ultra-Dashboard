// Freebox model types and capabilities
// Used for automatic feature detection and UI adaptation

export type FreeboxModel = 'ultra' | 'delta' | 'pop' | 'revolution' | 'unknown';

export type VmSupport = 'full' | 'limited' | 'none';
// @deprecated All Freebox models now use 'legacy' temperature fields (temp_cpum, temp_sw, temp_cpub)
export type TemperatureType = 'legacy';
export type BoxFlavor = 'full' | 'light';

export interface FreeboxCapabilities {
  // Model identification
  model: FreeboxModel;
  modelName: string;        // e.g., "Freebox v9 (r1)", "Freebox Pop"
  boxFlavor: BoxFlavor;     // 'full' = internal storage, 'light' = external only

  // Feature flags
  wifi6ghz: boolean;        // WiFi 6E/7 (6GHz band) support - Ultra (tri-band) & Delta (WiFi 6E) have 6GHz, Pop & Revolution do NOT
  wifi7: boolean;           // WiFi 7 support - Ultra (tri-band) & Pop (bi-band 2.4+5GHz only)
  vmSupport: VmSupport;     // VM support level
  maxVms: number;           // Maximum number of VMs
  maxVmRam: number;         // Maximum VM RAM in GB

  // Hardware specifics
  temperatureType: TemperatureType;
  temperatureFields: string[];
  hasInternalStorage: boolean;

  // Network speeds (theoretical max in Mbps)
  maxEthernetSpeed: number; // Ethernet port speed (1000, 2500, 10000)
  maxDownloadSpeed: number; // Max download speed in Mbps
  maxUploadSpeed: number;   // Max upload speed in Mbps
}

// Base capabilities for each model (without runtime-detected fields)
export interface ModelBaseCapabilities {
  model: FreeboxModel;
  wifi6ghz: boolean;
  wifi7: boolean;
  vmSupport: VmSupport;
  maxVms: number;
  maxVmRam: number;
  temperatureType: TemperatureType;
  temperatureFields: string[];
  hasInternalStorage: boolean;
  maxEthernetSpeed: number;
  maxDownloadSpeed: number;
  maxUploadSpeed: number;
}

// Predefined capabilities for each Freebox model
// Official specs from Free.fr (December 2024):
// - Ultra: https://www.free.fr/freebox/freebox-ultra/
// - Delta: https://www.free.fr/freebox/freebox-delta/
// - Pop: https://www.free.fr/freebox/freebox-pop/
export const MODEL_CAPABILITIES: Record<FreeboxModel, ModelBaseCapabilities> = {
  ultra: {
    model: 'ultra',
    wifi6ghz: true,           // WiFi 7 tri-band (2.4GHz + 2x5GHz + 6GHz)
    wifi7: true,
    vmSupport: 'full',
    maxVms: 10,
    maxVmRam: 16,
    temperatureType: 'legacy', // All Freebox models use the same temp fields
    temperatureFields: ['temp_cpum', 'temp_sw', 'temp_cpub'],
    hasInternalStorage: false, // NVMe slot available, no disk by default (detected via box_flavor)
    maxEthernetSpeed: 10000,  // 10G SFP LAN + 4x 2.5G Ethernet
    maxDownloadSpeed: 8000,   // 8 Gbps symmetric (10G-EPON)
    maxUploadSpeed: 8000      // 8 Gbps symmetric
  },

  delta: {
    model: 'delta',
    wifi6ghz: true,           // WiFi 6E tri-band (2.4GHz + 5GHz + 6GHz) since 2022
    wifi7: false,
    vmSupport: 'limited',
    maxVms: 3,
    maxVmRam: 16,             // With RAM extension
    temperatureType: 'legacy',
    temperatureFields: ['temp_cpum', 'temp_sw', 'temp_cpub'],
    hasInternalStorage: true, // NAS with up to 4 HDD slots
    maxEthernetSpeed: 10000,  // 10G-EPON
    maxDownloadSpeed: 8000,   // 8 Gbps download (10G-EPON)
    maxUploadSpeed: 700       // 700 Mbps upload
  },

  pop: {
    model: 'pop',
    wifi6ghz: false,          // WiFi 7 BI-BAND only (2.4GHz 2x2 + 5GHz 2x2, NO 6GHz!)
    wifi7: true,
    vmSupport: 'none',
    maxVms: 0,
    maxVmRam: 0,
    temperatureType: 'legacy',
    temperatureFields: ['temp_cpum', 'temp_sw', 'temp_cpub'],
    hasInternalStorage: false, // No internal storage, USB only
    maxEthernetSpeed: 2500,   // 1x 2.5G + 2x 1G Ethernet
    maxDownloadSpeed: 5000,   // 5 Gbps shared (2.5G eth + 2x1G eth + 0.5G wifi)
    maxUploadSpeed: 700       // 700 Mbps upload
  },

  revolution: {
    model: 'revolution',
    wifi6ghz: false,          // WiFi 5 (802.11ac)
    wifi7: false,
    vmSupport: 'none',
    maxVms: 0,
    maxVmRam: 0,
    temperatureType: 'legacy',
    temperatureFields: ['temp_cpum', 'temp_sw', 'temp_cpub'],
    hasInternalStorage: true, // 250GB internal HDD
    maxEthernetSpeed: 1000,   // 1 Gbps Ethernet
    maxDownloadSpeed: 1000,   // 1 Gbps download
    maxUploadSpeed: 600       // 600 Mbps upload
  },

  unknown: {
    model: 'unknown',
    wifi6ghz: false,
    wifi7: false,
    vmSupport: 'none',
    maxVms: 0,
    maxVmRam: 0,
    temperatureType: 'legacy',
    temperatureFields: ['temp_cpum', 'temp_sw', 'temp_cpub'],
    hasInternalStorage: false,
    maxEthernetSpeed: 1000,
    maxDownloadSpeed: 1000,
    maxUploadSpeed: 600
  }
};

// Helper to detect model from box_model_name string
export function detectModelFromName(modelName: string): FreeboxModel {
  const lower = modelName.toLowerCase();

  // Check for specific model identifiers
  // CORRECT MAPPING: Ultra=v9, Pop=v8, Delta=v7, Revolution/Mini4K=v6

  // Ultra / v9
  if (lower.includes('v9') || lower.includes('ultra')) {
    console.log('[ModelDetection] Detected Ultra (v9)');
    return 'ultra';
  }

  // Pop / v8 - MUST be checked before Delta
  // Pop identifiers: "pop", "v8", "Freebox Pop", "Freebox v8", etc.
  if (lower.includes('pop') || lower.includes('v8')) {
    console.log('[ModelDetection] Detected Pop (v8)');
    return 'pop';
  }

  // Delta / v7
  if (lower.includes('v7') || lower.includes('delta')) {
    console.log('[ModelDetection] Detected Delta (v7)');
    return 'delta';
  }

  // Revolution / v6
  if (lower.includes('v6') || lower.includes('revolution') || lower.includes('révolution') || lower.includes('fbxgw1')) {
    console.log('[ModelDetection] Detected Revolution (v6)');
    return 'revolution';
  }

  // Mini 4K / v6 - same as Revolution
  if (lower.includes('mini') || lower.includes('fbxgw7')) {
    console.log('[ModelDetection] Detected Mini 4K (v6)');
    return 'revolution';
  }

  console.log('[ModelDetection] Unknown model:', modelName);
  return 'unknown';
}

// Build full capabilities from detected model and runtime info
export function buildCapabilities(
  model: FreeboxModel,
  modelName: string,
  boxFlavor: BoxFlavor
): FreeboxCapabilities {
  const base = MODEL_CAPABILITIES[model];

  return {
    ...base,
    modelName,
    boxFlavor,
    // Override hasInternalStorage based on actual box_flavor
    hasInternalStorage: boxFlavor === 'full'
  };
}
