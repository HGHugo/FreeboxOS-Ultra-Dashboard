/**
 * API Normalizer Service
 *
 * Handles automatic compatibility between different Freebox API versions.
 * The Freebox API format varies between models and firmware versions:
 *
 * - API v8+ (Ultra, recent Delta/Pop): Uses sensors[] and fans[] arrays
 * - Legacy API (older firmware): Uses flat fields like temp_cpum, fan_rpm
 *
 * This service normalizes responses to provide BOTH formats for backward compatibility.
 */

export interface NormalizedSensor {
  id: string;
  name: string;
  value: number;
}

export interface NormalizedSystemInfo {
  // Original data preserved
  [key: string]: unknown;

  // Normalized arrays (API v8+ format)
  sensors?: NormalizedSensor[];
  fans?: NormalizedSensor[];

  // Legacy flat fields (always populated for compatibility)
  temp_cpu0?: number;
  temp_cpu1?: number;
  temp_cpu2?: number;
  temp_cpu3?: number;
  temp_cpum?: number;
  temp_cpub?: number;
  temp_sw?: number;
  fan_rpm?: number;
}

// Sensor ID to display name mapping
const SENSOR_NAMES: Record<string, string> = {
  // Ultra v9 sensors
  'temp_cpu0': 'CPU 0',
  'temp_cpu1': 'CPU 1',
  'temp_cpu2': 'CPU 2',
  'temp_cpu3': 'CPU 3',
  // Legacy sensors
  'temp_cpum': 'CPU',
  'temp_cpub': 'CPU Box',
  'temp_sw': 'Switch',
  // HDD sensors
  'temp_hdd': 'Disque',
  'temp_hdd0': 'Disque 1',
  'temp_hdd1': 'Disque 2',
  // Short IDs (some firmwares)
  't1': 'CPU',
  't2': 'CPU Box',
  't3': 'Switch',
  'cpu_ap': 'CPU',
  'cpu_cp': 'CPU Box',
  'switch': 'Switch'
};

// Fan ID to display name mapping
const FAN_NAMES: Record<string, string> = {
  'fan0_speed': 'Ventilateur 1',
  'fan1_speed': 'Ventilateur 2',
  'fan0': 'Ventilateur 1',
  'fan1': 'Ventilateur 2',
  'main': 'Ventilateur',
  'fan': 'Ventilateur',
  'fan_rpm': 'Ventilateur'
};

/**
 * Get a friendly display name for a sensor
 */
function getSensorDisplayName(id: string, originalName?: string): string {
  // Use mapping if available
  if (SENSOR_NAMES[id]) {
    return SENSOR_NAMES[id];
  }

  // Clean up the original name if provided
  if (originalName) {
    // Remove "Température " prefix if present
    return originalName
      .replace(/^Température\s+/i, '')
      .replace(/^Temperature\s+/i, '')
      .trim();
  }

  // Fallback: clean up the ID
  return id
    .replace('temp_', '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Get a friendly display name for a fan
 */
function getFanDisplayName(id: string, originalName?: string): string {
  if (FAN_NAMES[id]) {
    return FAN_NAMES[id];
  }

  if (originalName) {
    return originalName;
  }

  return id
    .replace('_speed', '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Normalize system info response to include both array and flat formats
 * This ensures compatibility with all Freebox models and API versions
 */
export function normalizeSystemInfo(data: Record<string, unknown>): NormalizedSystemInfo {
  const result: NormalizedSystemInfo = { ...data };

  // Handle sensors array (API v8+)
  const rawSensors = data.sensors as Array<{id: string; name: string; value: number}> | undefined;
  if (rawSensors && Array.isArray(rawSensors)) {
    // Normalize sensor names and extract to flat fields
    result.sensors = rawSensors.map(sensor => ({
      id: sensor.id,
      name: getSensorDisplayName(sensor.id, sensor.name),
      value: sensor.value
    }));

    // Extract to legacy flat fields for backward compatibility
    for (const sensor of rawSensors) {
      if (sensor.id.startsWith('temp_')) {
        result[sensor.id] = sensor.value;
      }
      // Map short IDs to legacy fields
      if (sensor.id === 't1' || sensor.id === 'cpu_ap') {
        result.temp_cpum = sensor.value;
      }
      if (sensor.id === 't2' || sensor.id === 'cpu_cp') {
        result.temp_cpub = sensor.value;
      }
      if (sensor.id === 't3' || sensor.id === 'switch') {
        result.temp_sw = sensor.value;
      }
    }

    // For Ultra: calculate cpum as average of 4 cores if not present
    if (result.temp_cpu0 != null && result.temp_cpum == null) {
      const coreTemps = [result.temp_cpu0, result.temp_cpu1, result.temp_cpu2, result.temp_cpu3]
        .filter((t): t is number => t != null);
      if (coreTemps.length > 0) {
        result.temp_cpum = Math.round(coreTemps.reduce((a, b) => a + b, 0) / coreTemps.length);
      }
    }
  } else {
    // Legacy format: build sensors array from flat fields
    const sensors: NormalizedSensor[] = [];

    // Check for Ultra v9 format (temp_cpu0-3)
    if (data.temp_cpu0 != null) {
      if (data.temp_cpu0 != null) sensors.push({ id: 'temp_cpu0', name: 'CPU 0', value: data.temp_cpu0 as number });
      if (data.temp_cpu1 != null) sensors.push({ id: 'temp_cpu1', name: 'CPU 1', value: data.temp_cpu1 as number });
      if (data.temp_cpu2 != null) sensors.push({ id: 'temp_cpu2', name: 'CPU 2', value: data.temp_cpu2 as number });
      if (data.temp_cpu3 != null) sensors.push({ id: 'temp_cpu3', name: 'CPU 3', value: data.temp_cpu3 as number });
    }

    // Legacy format (temp_cpum, etc.)
    if (data.temp_cpum != null) sensors.push({ id: 'temp_cpum', name: 'CPU', value: data.temp_cpum as number });
    if (data.temp_cpub != null) sensors.push({ id: 'temp_cpub', name: 'CPU Box', value: data.temp_cpub as number });
    if (data.temp_sw != null) sensors.push({ id: 'temp_sw', name: 'Switch', value: data.temp_sw as number });

    if (sensors.length > 0) {
      result.sensors = sensors;
    }
  }

  // Handle fans array (API v8+)
  const rawFans = data.fans as Array<{id: string; name: string; value: number}> | undefined;
  if (rawFans && Array.isArray(rawFans)) {
    // Normalize fan names
    result.fans = rawFans.map(fan => ({
      id: fan.id,
      name: getFanDisplayName(fan.id, fan.name),
      value: fan.value
    }));

    // Extract to legacy flat field
    const mainFan = rawFans.find(f =>
      f.id === 'fan0_speed' || f.id === 'main' || f.id === 'fan0' || f.id === 'fan'
    ) || rawFans[0];

    if (mainFan) {
      result.fan_rpm = mainFan.value;
    }
  } else if (data.fan_rpm != null) {
    // Legacy format: build fans array from flat field
    result.fans = [{
      id: 'fan_rpm',
      name: 'Ventilateur',
      value: data.fan_rpm as number
    }];
  }

  return result;
}

/**
 * Detect API capabilities from version info
 */
export interface ApiCapabilities {
  version: string;
  hasSensorsArray: boolean;
  hasFansArray: boolean;
  supportsPagination: boolean;
}

export function detectApiCapabilities(apiVersion: string | undefined): ApiCapabilities {
  const version = apiVersion || 'v4';
  const versionNum = parseInt(version.replace('v', ''), 10) || 4;

  return {
    version,
    hasSensorsArray: versionNum >= 8,
    hasFansArray: versionNum >= 8,
    supportsPagination: versionNum >= 15
  };
}
