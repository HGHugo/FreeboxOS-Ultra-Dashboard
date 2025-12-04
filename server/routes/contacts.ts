import { Router } from 'express';
import { freeboxApi } from '../services/freeboxApi.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/contacts - Get all contacts
router.get('/', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getContacts();
  res.json(result);
}));

// GET /api/contacts/:id - Get specific contact
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await freeboxApi.getContact(parseInt(req.params.id));
  res.json(result);
}));

// POST /api/contacts - Create contact
router.post('/', asyncHandler(async (req, res) => {
  const result = await freeboxApi.createContact(req.body);
  res.json(result);
}));

// PUT /api/contacts/:id - Update contact
router.put('/:id', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateContact(parseInt(req.params.id), req.body);
  res.json(result);
}));

// DELETE /api/contacts/:id - Delete contact
router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await freeboxApi.deleteContact(parseInt(req.params.id));
  res.json(result);
}));

export default router;