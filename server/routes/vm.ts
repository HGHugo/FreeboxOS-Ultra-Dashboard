import { Router } from 'express';
import { freeboxApi } from '../services/freeboxApi.js';
import { modelDetection } from '../services/modelDetection.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';

const router = Router();

// Mock data for VMs (fallback if real API not available)
// Note: The Freebox API does NOT provide cpu_usage, memory_usage, disk_usage per VM
// These stats are only available at system level via /vm/info/ (VmSystemInfo)
const mockVms = [
  {
    id: 1,
    name: 'VM Plex',
    os: 'debian',
    status: 'running',
    vcpus: 2,
    memory: 4096, // 4GB allocated (in MB as per API doc)
    disk_path: '/Freebox/VMs/plex.qcow2',
    disk_type: 'qcow2',
    disk_size: 53687091200, // 50GB in bytes
    enable_screen: true,
    mac: '00:07:CB:00:00:01'
  },
  {
    id: 2,
    name: 'VM Home Assistant',
    os: 'debian',
    status: 'running',
    vcpus: 2,
    memory: 2048, // 2GB allocated (in MB as per API doc)
    disk_path: '/Freebox/VMs/homeassistant.qcow2',
    disk_type: 'qcow2',
    disk_size: 21474836480, // 20GB in bytes
    enable_screen: true,
    mac: '00:07:CB:00:00:02'
  },
  {
    id: 3,
    name: 'VM Ubuntu Server',
    os: 'ubuntu',
    status: 'stopped',
    vcpus: 4,
    memory: 8192, // 8GB allocated (in MB as per API doc)
    disk_path: '/Freebox/VMs/ubuntu.qcow2',
    disk_type: 'qcow2',
    disk_size: 107374182400, // 100GB in bytes
    enable_screen: true,
    mac: '00:07:CB:00:00:03'
  }
];

// Mock VM system info (fallback)
const mockVmInfo = {
  total_memory: 16384,  // 16GB total available for VMs (in MB)
  used_memory: 8192,    // 8GB currently used (in MB)
  total_cpus: 4,        // 4 vCPUs available
  used_cpus: 4,         // 4 vCPUs currently allocated
  usb_used: false,
  usb_ports: ['usb-external-type-a', 'usb-external-type-c']
};

// GET /api/vm/info - Get VM system info (total/used memory, cpus)
// IMPORTANT: Must be defined BEFORE /:id routes to avoid conflicts
router.get('/info', asyncHandler(async (_req, res) => {
  // Check if VMs are supported on this model
  const capabilities = modelDetection.getCapabilities();
  if (capabilities && capabilities.vmSupport === 'none') {
    res.status(403).json({
      success: false,
      error: {
        code: 'vm_not_supported',
        message: `Les machines virtuelles ne sont pas supportées sur ${capabilities.modelName}`
      }
    });
    return;
  }

  try {
    const result = await freeboxApi.getVmInfo();
    res.json(result);
  } catch {
    // Fallback to mock data if API not available
    console.log('[VM] VmInfo API not available, using mock data');
    res.json({
      success: true,
      result: mockVmInfo
    });
  }
}));

// GET /api/vm/distros - Get available distros
// IMPORTANT: Must be defined BEFORE /:id routes to avoid conflicts
router.get('/distros', asyncHandler(async (_req, res) => {
  try {
    const result = await freeboxApi.getVmDistros();
    res.json(result);
  } catch {
    // Return empty list if not available
    res.json({
      success: true,
      result: []
    });
  }
}));

// GET /api/vm - Get all VMs
router.get('/', asyncHandler(async (_req, res) => {
  // Check if VMs are supported on this model
  const capabilities = modelDetection.getCapabilities();
  if (capabilities && capabilities.vmSupport === 'none') {
    res.status(403).json({
      success: false,
      error: {
        code: 'vm_not_supported',
        message: `Les machines virtuelles ne sont pas supportées sur ${capabilities.modelName}`
      }
    });
    return;
  }

  try {
    const result = await freeboxApi.getVms();
    res.json(result);
  } catch {
    // Fallback to mock data if API not available
    console.log('[VM] Real API not available, using mock data');
    res.json({
      success: true,
      result: mockVms
    });
  }
}));

// GET /api/vm/:id - Get specific VM
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createError('Invalid VM ID', 400, 'INVALID_ID');
  }

  try {
    const result = await freeboxApi.getVm(id);
    res.json(result);
  } catch {
    // Fallback to mock data
    const vm = mockVms.find(v => v.id === id);
    if (!vm) {
      throw createError('VM not found', 404, 'NOT_FOUND');
    }
    res.json({
      success: true,
      result: vm
    });
  }
}));

// POST /api/vm/:id/start - Start VM
router.post('/:id/start', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createError('Invalid VM ID', 400, 'INVALID_ID');
  }

  try {
    const result = await freeboxApi.startVm(id);
    res.json(result);
  } catch {
    // Mock response
    const vm = mockVms.find(v => v.id === id);
    if (vm) vm.status = 'running';
    res.json({
      success: true,
      result: { message: 'VM started' }
    });
  }
}));

// POST /api/vm/:id/stop - Stop VM
router.post('/:id/stop', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createError('Invalid VM ID', 400, 'INVALID_ID');
  }

  try {
    const result = await freeboxApi.stopVm(id);
    res.json(result);
  } catch {
    // Mock response
    const vm = mockVms.find(v => v.id === id);
    if (vm) vm.status = 'stopped';
    res.json({
      success: true,
      result: { message: 'VM stopped' }
    });
  }
}));

// POST /api/vm/:id/restart - Restart VM
router.post('/:id/restart', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createError('Invalid VM ID', 400, 'INVALID_ID');
  }

  try {
    const result = await freeboxApi.restartVm(id);
    res.json(result);
  } catch {
    res.json({
      success: true,
      result: { message: 'VM restarted' }
    });
  }
}));

// POST /api/vm - Create a new VM
router.post('/', asyncHandler(async (req, res) => {
  // Check if VMs are supported on this model
  const capabilities = modelDetection.getCapabilities();
  if (capabilities && capabilities.vmSupport === 'none') {
    res.status(403).json({
      success: false,
      error: {
        code: 'vm_not_supported',
        message: `Les machines virtuelles ne sont pas supportées sur ${capabilities.modelName}`
      }
    });
    return;
  }

  // If limited VM support, check current VM count
  if (capabilities && capabilities.vmSupport === 'limited') {
    try {
      const vmsResult = await freeboxApi.getVms();
      if (vmsResult.success && Array.isArray(vmsResult.result)) {
        const currentVmCount = vmsResult.result.length;
        if (currentVmCount >= capabilities.maxVms) {
          res.status(400).json({
            success: false,
            error: {
              code: 'vm_limit_reached',
              message: `Limite atteinte: ${capabilities.modelName} supporte maximum ${capabilities.maxVms} VM(s). Vous en avez déjà ${currentVmCount}.`
            }
          });
          return;
        }
      }
    } catch {
      // Continue anyway if we can't check
      console.log('[VM] Could not check VM count for limit');
    }
  }

  // First check if disk is available
  try {
    const disksResult = await freeboxApi.getDisks();
    if (!disksResult.success || !disksResult.result || (Array.isArray(disksResult.result) && disksResult.result.length === 0)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'no_disk',
          message: 'Aucun disque disponible. Un disque est nécessaire pour créer une VM.'
        }
      });
      return;
    }
  } catch {
    res.status(400).json({
      success: false,
      error: {
        code: 'disk_check_failed',
        message: 'Impossible de vérifier la disponibilité du disque.'
      }
    });
    return;
  }

  try {
    const result = await freeboxApi.createVm(req.body);
    res.json(result);
  } catch (error) {
    console.error('[VM] Create VM error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'vm_create_failed',
        message: 'Impossible de créer la VM.'
      }
    });
  }
}));

// PUT /api/vm/:id - Update VM
router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createError('Invalid VM ID', 400, 'INVALID_ID');
  }

  try {
    const result = await freeboxApi.updateVm(id, req.body);
    res.json(result);
  } catch {
    res.status(500).json({
      success: false,
      error: {
        code: 'vm_update_failed',
        message: 'Impossible de mettre à jour la VM.'
      }
    });
  }
}));

// DELETE /api/vm/:id - Delete VM
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw createError('Invalid VM ID', 400, 'INVALID_ID');
  }

  try {
    const result = await freeboxApi.deleteVm(id);
    res.json(result);
  } catch {
    res.status(500).json({
      success: false,
      error: {
        code: 'vm_delete_failed',
        message: 'Impossible de supprimer la VM.'
      }
    });
  }
}));

export default router;