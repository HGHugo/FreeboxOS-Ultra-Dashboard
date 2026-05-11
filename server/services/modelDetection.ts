// Model Detection Service
// Detects the Freebox model and provides capability information
//
// TESTING: Set MOCK_FREEBOX_MODEL env var to test different models:
//   MOCK_FREEBOX_MODEL=pop npm start     -> Simulates Freebox POP
//   MOCK_FREEBOX_MODEL=delta npm start   -> Simulates Freebox Delta
//   MOCK_FREEBOX_MODEL=ultra npm start   -> Simulates Freebox Ultra (default)
//   MOCK_FREEBOX_MODEL=revolution npm start -> Simulates Freebox Revolution

import {
  FreeboxModel,
  FreeboxCapabilities,
  BoxFlavor,
  detectModelFromName,
  buildCapabilities,
  MODEL_CAPABILITIES
} from '../types/capabilities.js';
import { freeboxApi } from './freeboxApi.js';

// Mock model names for testing
const MOCK_MODEL_NAMES: Record<FreeboxModel, { name: string; flavor: BoxFlavor }> = {
  ultra: { name: 'Freebox v9 (r1)', flavor: 'full' },
  delta: { name: 'Freebox v8 (Delta)', flavor: 'full' },
  pop: { name: 'Freebox Pop', flavor: 'light' },
  revolution: { name: 'Freebox v6 (Revolution)', flavor: 'full' },
  unknown: { name: 'Freebox', flavor: 'light' }
};

interface ApiVersionResponse {
  box_model_name?: string;
  box_model?: string;
  box_flavor?: string;
  device_name?: string;
  api_version?: string;
  api_base_url?: string;
}

class ModelDetectionService {
  private capabilities: FreeboxCapabilities | null = null;
  private detectionPromise: Promise<FreeboxCapabilities> | null = null;
  private lastDetectionTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Detect the Freebox model and return its capabilities
   * Results are cached for performance
   */
  async detectModel(): Promise<FreeboxCapabilities> {
    // Return cached result if still valid
    if (this.capabilities && Date.now() - this.lastDetectionTime < this.CACHE_DURATION) {
      return this.capabilities;
    }

    // Prevent multiple simultaneous detections
    if (this.detectionPromise) {
      return this.detectionPromise;
    }

    this.detectionPromise = this._performDetection();

    try {
      const result = await this.detectionPromise;
      return result;
    } finally {
      this.detectionPromise = null;
    }
  }

  /**
   * Internal detection logic
   */
  private async _performDetection(): Promise<FreeboxCapabilities> {
    // Check for mock model (for testing without different Freebox hardware)
    const mockModel = process.env.MOCK_FREEBOX_MODEL?.toLowerCase() as FreeboxModel | undefined;
    if (mockModel && MOCK_MODEL_NAMES[mockModel]) {
      const mock = MOCK_MODEL_NAMES[mockModel];
      console.log(`[ModelDetection] MOCK MODE: Simulating ${mock.name} (MOCK)`);
      // Don't add "(MOCK)" to the modelName - it's only for server logs
      this.capabilities = buildCapabilities(mockModel, mock.name, mock.flavor);
      this.lastDetectionTime = Date.now();
      console.log(`[ModelDetection] Mock Capabilities:`, {
        model: this.capabilities.model,
        wifi6ghz: this.capabilities.wifi6ghz,
        vmSupport: this.capabilities.vmSupport,
        hasInternalStorage: this.capabilities.hasInternalStorage
      });
      return this.capabilities;
    }

    try {
      console.log('[ModelDetection] Starting model detection...');

      const apiVersion = await freeboxApi.getApiVersion();

      if (!apiVersion.success || !apiVersion.result) {
        console.warn('[ModelDetection] Failed to get API version, using defaults');
        return this.buildDefaultCapabilities();
      }

      const versionData = apiVersion.result as ApiVersionResponse;
      const modelName = versionData.box_model_name || versionData.box_model || versionData.device_name || 'Unknown';
      const boxFlavor = (versionData.box_flavor === 'full' ? 'full' : 'light') as BoxFlavor;

      console.log('[ModelDetection] API response:', {
        box_model_name: versionData.box_model_name,
        box_model: versionData.box_model,
        box_flavor: versionData.box_flavor,
        device_name: versionData.device_name
      });
      console.log(`[ModelDetection] Using model name: "${modelName}"`);

      // Detect model from name
      const model = detectModelFromName(modelName);

      // Build capabilities
      this.capabilities = buildCapabilities(model, modelName, boxFlavor);

      // Check for actual internal storage via /storage/disk/ API
      // This is more reliable than box_flavor for Delta/Ultra with installed disks
      const hasRealStorage = await this.checkActualStorage();
      if (hasRealStorage && !this.capabilities.hasInternalStorage) {
        console.log('[ModelDetection] Detected internal/sata/nvme disk - overriding hasInternalStorage to true');
        this.capabilities.hasInternalStorage = true;
      }

      this.lastDetectionTime = Date.now();

      console.log(`[ModelDetection] Detected: ${modelName} -> ${model}`);
      console.log(`[ModelDetection] Capabilities:`, {
        model: this.capabilities.model,
        wifi6ghz: this.capabilities.wifi6ghz,
        vmSupport: this.capabilities.vmSupport,
        hasInternalStorage: this.capabilities.hasInternalStorage
      });

      return this.capabilities;
    } catch (error) {
      console.error('[ModelDetection] Detection failed:', error);
      return this.buildDefaultCapabilities();
    }
  }

  /**
   * Build default capabilities for unknown/error cases
   */
  private buildDefaultCapabilities(): FreeboxCapabilities {
    const defaults = buildCapabilities('unknown', 'Freebox', 'light');
    this.capabilities = defaults;
    this.lastDetectionTime = Date.now();
    return defaults;
  }

  /**
   * Check for actual internal storage via /storage/disk/ API
   * Returns true if internal, sata, or nvme disks are present
   * This is more reliable than box_flavor for Delta/Ultra with installed disks
   */
  private async checkActualStorage(): Promise<boolean> {
    try {
      const disksResponse = await freeboxApi.getDisks();
      if (!disksResponse.success || !disksResponse.result) {
        return false;
      }

      const disks = disksResponse.result as Array<{ type?: string; state?: string }>;
      if (!Array.isArray(disks)) {
        return false;
      }

      // Check if any disk is internal, sata, or nvme (not just USB)
      // Types from API: 'internal', 'usb', 'sata', 'nvme'
      const internalTypes = ['internal', 'sata', 'nvme'];
      const hasInternalDisk = disks.some(disk =>
        disk.type && internalTypes.includes(disk.type) && disk.state !== 'disabled'
      );

      if (hasInternalDisk) {
        console.log('[ModelDetection] Found internal/sata/nvme disk(s):', disks.filter(d => internalTypes.includes(d.type || '')).map(d => d.type));
      }

      return hasInternalDisk;
    } catch (error) {
      console.log('[ModelDetection] Could not check storage disks:', error);
      return false;
    }
  }

  /**
   * Get cached capabilities without triggering detection
   */
  getCapabilities(): FreeboxCapabilities | null {
    return this.capabilities;
  }

  /**
   * Clear cached capabilities (call on logout or when needed)
   */
  clearCache(): void {
    this.capabilities = null;
    this.detectionPromise = null;
    this.lastDetectionTime = 0;
    console.log('[ModelDetection] Cache cleared');
  }

  /**
   * Force refresh capabilities
   */
  async refreshCapabilities(): Promise<FreeboxCapabilities> {
    this.clearCache();
    return this.detectModel();
  }

  // ============================================
  // Helper methods for feature checks
  // ============================================

  /**
   * Check if VMs are supported
   */
  supportsVm(): boolean {
    return this.capabilities?.vmSupport !== 'none';
  }

  /**
   * Check if VMs are fully supported (not limited)
   */
  hasFullVmSupport(): boolean {
    return this.capabilities?.vmSupport === 'full';
  }

  /**
   * Get max number of VMs allowed
   */
  getMaxVms(): number {
    return this.capabilities?.maxVms ?? 0;
  }

  /**
   * Check if WiFi 6GHz is supported
   */
  supportsWifi6ghz(): boolean {
    return this.capabilities?.wifi6ghz ?? false;
  }

  /**
   * Check if internal storage is available
   */
  hasInternalStorage(): boolean {
    return this.capabilities?.hasInternalStorage ?? false;
  }

  /**
   * Get the detected model
   */
  getModel(): FreeboxModel {
    return this.capabilities?.model ?? 'unknown';
  }

  /**
   * Get the display name of the box
   */
  getModelName(): string {
    return this.capabilities?.modelName ?? 'Freebox';
  }

  /**
   * Get temperature fields for this model
   */
  getTemperatureFields(): string[] {
    return this.capabilities?.temperatureFields ?? MODEL_CAPABILITIES.unknown.temperatureFields;
  }

  /**
   * Check if model is Ultra
   */
  isUltra(): boolean {
    return this.capabilities?.model === 'ultra';
  }

  /**
   * Check if model is Delta
   */
  isDelta(): boolean {
    return this.capabilities?.model === 'delta';
  }

  /**
   * Check if model is POP
   */
  isPop(): boolean {
    return this.capabilities?.model === 'pop';
  }
}

// Export singleton instance
export const modelDetection = new ModelDetectionService();
