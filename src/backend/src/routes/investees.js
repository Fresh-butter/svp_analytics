const { Router } = require('express');
const { InvesteeController } = require('../controllers');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = Router();

router.get('/', authenticate, (req, res) => {
  // #swagger.tags = ['Investees']
  // #swagger.summary = 'List all investees'
  // #swagger.description = 'Returns investees for a chapter. Supports filtering by active status.'
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
  /* #swagger.responses[200] = { description: 'List of investees' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return InvesteeController.list(req, res);
});

router.get('/:id', authenticate, (req, res) => {
  // #swagger.tags = ['Investees']
  // #swagger.summary = 'Get investee by ID'
  // #swagger.description = 'Returns an investee with groups and appointment details. Optionally filtered by month and year.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Investee UUID'
     } */
  /* #swagger.parameters['month'] = {
       in: 'query',
       type: 'string',
       description: 'Month number 1-12. Defaults to current month.'
     } */
  /* #swagger.parameters['year'] = {
       in: 'query',
       type: 'string',
       description: 'Year, e.g. 2025. Defaults to current year.'
     } */
  /* #swagger.responses[200] = { description: 'Investee details' } */
  /* #swagger.responses[404] = { description: 'Investee not found' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return InvesteeController.get(req, res);
});

router.post('/', authenticate, requireAdmin, (req, res) => {
  // #swagger.tags = ['Investees']
  // #swagger.summary = 'Create a new investee'
  // #swagger.description = 'Creates a new investee. Requires chapter_id, investee_name, email, and start_date.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.requestBody = {
       required: true,
       content: {
         "application/json": {
           schema: {
             type: 'object',
             required: ['chapter_id', 'investee_name', 'email', 'start_date'],
             properties: {
               chapter_id: { type: 'string', format: 'uuid' },
               investee_name: { type: 'string', example: 'Acme Corp' },
               email: { type: 'string', example: 'contact@acme.com' },
               start_date: { type: 'string', format: 'date', example: '2025-01-15' },
               end_date: { type: 'string', format: 'date' },
               is_active: { type: 'boolean', example: true }
             }
           }
         }
       }
     } */
  /* #swagger.responses[201] = { description: 'Investee created' } */
  /* #swagger.responses[400] = { description: 'Validation error' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return InvesteeController.create(req, res);
});

router.put('/:id', authenticate, requireAdmin, (req, res) => {
  // #swagger.tags = ['Investees']
  // #swagger.summary = 'Update an investee'
  // #swagger.description = 'Update investee details by ID.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Investee UUID'
     } */
  /* #swagger.requestBody = {
       required: true,
       content: {
         "application/json": {
           schema: {
             type: 'object',
             properties: {
               investee_name: { type: 'string' },
               email: { type: 'string' },
               start_date: { type: 'string', format: 'date' },
               end_date: { type: 'string', format: 'date' },
               is_active: { type: 'boolean' }
             }
           }
         }
       }
     } */
  /* #swagger.responses[200] = { description: 'Investee updated' } */
  /* #swagger.responses[404] = { description: 'Investee not found' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return InvesteeController.update(req, res);
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  // #swagger.tags = ['Investees']
  // #swagger.summary = 'Delete an investee'
  // #swagger.description = 'Deletes an investee. Blocked if referenced by other entities.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Investee UUID'
     } */
  /* #swagger.responses[200] = { description: 'Investee deleted' } */
  /* #swagger.responses[404] = { description: 'Investee not found' } */
  /* #swagger.responses[409] = { description: 'Investee is referenced and cannot be deleted' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return InvesteeController.remove(req, res);
});

module.exports = router;
