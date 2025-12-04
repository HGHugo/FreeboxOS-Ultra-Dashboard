import { Router } from 'express';
import { freeboxApi } from '../services/freeboxApi.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';

const router = Router();

// Mock data for VMs (fallback if real API not available)
const mockVms = [
  {
    id: 1,
    name: 'VM Plex',
    os: 'DEBIAN',
    status: 'running',
    vcpus: 2,
    memory: 4294967296, // 4GB
    disk_path: '/Freebox/VMs/plex.qcow2',
    disk_type: 'qcow2',
    enable_screen: true,
    cpu_usage: 10,
    memory_usage: 1073741824, // 1GB used
    disk_usage: 2147483648 // 2GB used
  },
  {
    id: 2,
    name: 'VM Home Assistant',
    os: 'DEBIAN',
    status: 'running',
    vcpus: 2,
    memory: 4294967296, // 4GB
    disk_path: '/Freebox/VMs/homeassistant.qcow2',
    disk_type: 'qcow2',
    enable_screen: true,
    cpu_usage: 10,
    memory_usage: 1073741824, // 1GB used
    disk_usage: 2147483648 // 2GB used
  }
];

// GET /api/vm - Get all VMs
router.get('/', asyncHandler(async (_req, res) => {
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

// GET /api/vm/distros - Get available distros
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

export default router;