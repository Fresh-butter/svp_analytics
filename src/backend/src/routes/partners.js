const { Router } = require('express');
const { PartnerController } = require('../controllers');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = Router();

router.get('/', authenticate, (req, res) => {
  // #swagger.tags = ['Partners']
  // #swagger.summary = 'List all partners'
  // #swagger.description = 'Returns partners for a chapter. Supports filtering by active status and primary flag.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['chapter_id'] = {
       in: 'query',
       type: 'string',
       format: 'uuid',
       description: 'Chapter UUID (defaults to authenticated user chapter)'
     } */
  /* #swagger.parameters['active'] = {
       in: 'query',
       type: 'string',
       enum: ['true', 'false'],
       description: 'Filter by active status'
     } */
  /* #swagger.parameters['primary'] = {
       in: 'query',
       type: 'string',
       description: 'Filter by primary partner name'
     } */
  /* #swagger.responses[200] = { description: 'List of partners' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return PartnerController.list(req, res);
});

router.get('/:id', authenticate, (req, res) => {
  // #swagger.tags = ['Partners']
  // #swagger.summary = 'Get partner by ID'
  // #swagger.description = 'Returns a partner with groups and appointment details. Optionally filtered by month and year.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Partner UUID'
     } */
  /* #swagger.parameters['month'] = {
       in: 'query',
       type: 'string',
       description: 'Month name, e.g. January. Defaults to current month.'
     } */
  /* #swagger.parameters['year'] = {
       in: 'query',
       type: 'string',
       description: 'Year, e.g. 2025. Defaults to current year.'
     } */
  /* #swagger.responses[200] = { description: 'Partner details' } */
  /* #swagger.responses[404] = { description: 'Partner not found' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return PartnerController.get(req, res);
});

router.post('/', authenticate, requireAdmin, (req, res) => {
  // #swagger.tags = ['Partners']
  // #swagger.summary = 'Create a new partner'
  // #swagger.description = 'Creates a new partner. Requires chapter_id, partner_name, and start_date.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.requestBody = {
       required: true,
       content: {
         "application/json": {
           schema: {
             type: 'object',
             required: ['chapter_id', 'partner_name', 'start_date'],
             properties: {
               chapter_id: { type: 'string', format: 'uuid' },
               partner_name: { type: 'string', example: 'Jane Doe' },
               email: { type: 'string', example: 'jane@example.com' },
               start_date: { type: 'string', format: 'date', example: '2025-01-15' },
               end_date: { type: 'string', format: 'date' },
               is_active: { type: 'boolean', example: true }
             }
           }
         }
       }
     } */
  /* #swagger.responses[201] = { description: 'Partner created' } */
  /* #swagger.responses[400] = { description: 'Validation error' } */
  /* #swagger.responses[409] = { description: 'Partner with this email already exists in this chapter' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return PartnerController.create(req, res);
});

router.put('/:id', authenticate, requireAdmin, (req, res) => {
  // #swagger.tags = ['Partners']
  // #swagger.summary = 'Update a partner'
  // #swagger.description = 'Update partner details by ID.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Partner UUID'
     } */
  /* #swagger.requestBody = {
       required: true,
       content: {
         "application/json": {
           schema: {
             type: 'object',
             properties: {
               partner_name: { type: 'string' },
               email: { type: 'string' },
               start_date: { type: 'string', format: 'date' },
               end_date: { type: 'string', format: 'date' },
               is_active: { type: 'boolean' }
             }
           }
         }
       }
     } */
  /* #swagger.responses[200] = { description: 'Partner updated' } */
  /* #swagger.responses[404] = { description: 'Partner not found' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return PartnerController.update(req, res);
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  // #swagger.tags = ['Partners']
  // #swagger.summary = 'Delete a partner'
  // #swagger.description = 'Deletes a partner. Blocked if referenced by other entities.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Partner UUID'
     } */
  /* #swagger.responses[200] = { description: 'Partner deleted' } */
  /* #swagger.responses[404] = { description: 'Partner not found' } */
  /* #swagger.responses[409] = { description: 'Partner is referenced and cannot be deleted' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return PartnerController.remove(req, res);
});

module.exports = router;
