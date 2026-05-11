import { Router } from 'express';
import { freeboxApi } from '../services/freeboxApi.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// ===== Profiles =====

// GET /api/parental/profiles - Get all profiles
router.get('/profiles', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getProfiles();
  res.json(result);
}));

// GET /api/parental/profiles/:id - Get specific profile
router.get('/profiles/:id', asyncHandler(async (req, res) => {
  const result = await freeboxApi.getProfile(parseInt(req.params.id));
  res.json(result);
}));

// POST /api/parental/profiles - Create profile
router.post('/profiles', asyncHandler(async (req, res) => {
  const result = await freeboxApi.createProfile(req.body);
  res.json(result);
}));

// PUT /api/parental/profiles/:id - Update profile
router.put('/profiles/:id', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateProfile(parseInt(req.params.id), req.body);
  res.json(result);
}));

// DELETE /api/parental/profiles/:id - Delete profile
router.delete('/profiles/:id', asyncHandler(async (req, res) => {
  const result = await freeboxApi.deleteProfile(parseInt(req.params.id));
  res.json(result);
}));

// ===== Network Control =====

// GET /api/parental/network-control - Get network control for all profiles
router.get('/network-control', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getNetworkControl();
  res.json(result);
}));

// GET /api/parental/network-control/:profileId - Get network control for a specific profile
router.get('/network-control/:profileId', asyncHandler(async (req, res) => {
  const result = await freeboxApi.getNetworkControlForProfile(parseInt(req.params.profileId));
  res.json(result);
}));

// PUT /api/parental/network-control/:profileId - Update network control for a profile
router.put('/network-control/:profileId', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateNetworkControlForProfile(parseInt(req.params.profileId), req.body);
  res.json(result);
}));

// ===== Network Control Rules =====

// GET /api/parental/network-control/:profileId/rules - Get rules for a profile
router.get('/network-control/:profileId/rules', asyncHandler(async (req, res) => {
  const result = await freeboxApi.getNetworkControlRules(parseInt(req.params.profileId));
  res.json(result);
}));

// GET /api/parental/network-control/:profileId/rules/:ruleId - Get a specific rule
router.get('/network-control/:profileId/rules/:ruleId', asyncHandler(async (req, res) => {
  const result = await freeboxApi.getNetworkControlRule(parseInt(req.params.profileId), parseInt(req.params.ruleId));
  res.json(result);
}));

// POST /api/parental/network-control/:profileId/rules - Create a rule
router.post('/network-control/:profileId/rules', asyncHandler(async (req, res) => {
  const result = await freeboxApi.createNetworkControlRule(parseInt(req.params.profileId), req.body);
  res.json(result);
}));

// PUT /api/parental/network-control/:profileId/rules/:ruleId - Update a rule
router.put('/network-control/:profileId/rules/:ruleId', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateNetworkControlRule(parseInt(req.params.profileId), parseInt(req.params.ruleId), req.body);
  res.json(result);
}));

// DELETE /api/parental/network-control/:profileId/rules/:ruleId - Delete a rule
router.delete('/network-control/:profileId/rules/:ruleId', asyncHandler(async (req, res) => {
  const result = await freeboxApi.deleteNetworkControlRule(parseInt(req.params.profileId), parseInt(req.params.ruleId));
  res.json(result);
}));

// ===== Parental Config =====

// GET /api/parental/config - Get parental config
router.get('/config', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getParentalConfig();
  res.json(result);
}));

// PUT /api/parental/config - Update parental config
router.put('/config', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateParentalConfig(req.body);
  res.json(result);
}));

// ===== Parental Filters (CRUD) =====

// GET /api/parental/filters - Get all parental filters
router.get('/filters', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getParentalFilters();
  res.json(result);
}));

// GET /api/parental/filters/:id - Get specific filter
router.get('/filters/:id', asyncHandler(async (req, res) => {
  const result = await freeboxApi.getParentalFilter(parseInt(req.params.id));
  res.json(result);
}));

// POST /api/parental/filters - Create new filter
router.post('/filters', asyncHandler(async (req, res) => {
  const result = await freeboxApi.createParentalFilter(req.body);
  res.json(result);
}));

// PUT /api/parental/filters/:id - Update filter
router.put('/filters/:id', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateParentalFilter(parseInt(req.params.id), req.body);
  res.json(result);
}));

// DELETE /api/parental/filters/:id - Delete filter
router.delete('/filters/:id', asyncHandler(async (req, res) => {
  const result = await freeboxApi.deleteParentalFilter(parseInt(req.params.id));
  res.json(result);
}));

// GET /api/parental/filters/:id/planning - Get filter planning
router.get('/filters/:id/planning', asyncHandler(async (req, res) => {
  const result = await freeboxApi.getParentalFilterPlanning(parseInt(req.params.id));
  res.json(result);
}));

// PUT /api/parental/filters/:id/planning - Update filter planning
router.put('/filters/:id/planning', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateParentalFilterPlanning(parseInt(req.params.id), req.body);
  res.json(result);
}));

export default router;